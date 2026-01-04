(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-ALREADY-SEALED (err u101))
(define-constant ERR-NOT-FOUND (err u102))
(define-constant ERR-INVALID-CHUNK (err u103))
(define-constant ERR-INCOMPLETE (err u104))
(define-constant ERR-INVALID-ID (err u105))

(define-constant MAX-CHUNK-SIZE u8192)

;; Job IDs live in a separate ID-space so unfinished jobs don't occupy the public "inscription ID"
;; sequence used by galleries/collections.
(define-constant JOB-ID-OFFSET u1000000)

;; Public, sealed-only inscription IDs (0..N-1)
(define-data-var next-inscription-id uint u0)
;; Draft/job IDs: JOB-ID-OFFSET.. (returned by begin-inscription)
(define-data-var next-job-seq uint u0)

;; Sealed inscriptions keyed by final public ID.
(define-map Inscriptions
    uint
    {
        owner: principal,
        mime-type: (string-ascii 64),
        total-size: uint,
        chunk-count: uint,
        sealed: bool,
        merkle-root: (buff 32),
        job-id: uint
    }
)

;; In-progress draft jobs keyed by job-id.
(define-map Jobs
    uint
    {
        owner: principal,
        mime-type: (string-ascii 64),
        total-size: uint,
        chunk-count: uint,
        uploaded-count: uint
    }
)

;; Chunk storage keyed by job-id so chunks can be written before a final inscription ID exists.
(define-map Chunks { job-id: uint, index: uint } (buff 8192))

(define-read-only (get-version) u3)
(define-read-only (get-next-inscription-id) (var-get next-inscription-id))

(define-read-only (is-job-id (id uint)) (>= id JOB-ID-OFFSET))

(define-public (begin-inscription (mime (string-ascii 64)) (total-size uint) (chunk-count uint))
    (begin
        (asserts! (> chunk-count u0) ERR-INVALID-CHUNK)
        (let (
            (seq (var-get next-job-seq))
            (job-id (+ JOB-ID-OFFSET (var-get next-job-seq)))
        )
            (asserts! (map-insert Jobs job-id {
                owner: tx-sender,
                mime-type: mime,
                total-size: total-size,
                chunk-count: chunk-count,
                uploaded-count: u0
            }) (err u106))
            (var-set next-job-seq (+ seq u1))
            (ok job-id)
        )
    )
)

(define-public (add-chunk (id uint) (index uint) (data (buff 8192)))
    (begin
        ;; In v3, uploads are keyed by job-id (draft IDs). Using a sealed ID is invalid.
        (asserts! (is-job-id id) ERR-INVALID-ID)
        (let ((job (unwrap! (map-get? Jobs id) ERR-NOT-FOUND)))
            (asserts! (is-eq tx-sender (get owner job)) ERR-NOT-AUTHORIZED)
            (asserts! (< index (get chunk-count job)) ERR-INVALID-CHUNK)
            (let (
                (key { job-id: id, index: index })
                (inserted (map-insert Chunks key data))
            )
                (if inserted
                    (begin
                        (map-set Jobs id (merge job { uploaded-count: (+ (get uploaded-count job) u1) }))
                        (ok true)
                    )
                    (begin
                        ;; Allow retries by overwriting existing chunk data.
                        (map-set Chunks key data)
                        (ok true)
                    )
                )
            )
        )
    )
)

(define-public (seal-inscription (id uint) (root (buff 32)))
    (begin
        (asserts! (is-job-id id) ERR-INVALID-ID)
        (let ((job (unwrap! (map-get? Jobs id) ERR-NOT-FOUND)))
            (asserts! (is-eq tx-sender (get owner job)) ERR-NOT-AUTHORIZED)
            (asserts! (is-eq (get uploaded-count job) (get chunk-count job)) ERR-INCOMPLETE)
            (let ((inscription-id (var-get next-inscription-id)))
                (asserts! (map-insert Inscriptions inscription-id {
                    owner: (get owner job),
                    mime-type: (get mime-type job),
                    total-size: (get total-size job),
                    chunk-count: (get chunk-count job),
                    sealed: true,
                    merkle-root: root,
                    job-id: id
                }) (err u107))
                (var-set next-inscription-id (+ inscription-id u1))
                (map-delete Jobs id)
                (ok inscription-id)
            )
        )
    )
)

;; For compatibility with the existing app:
;; - `get-inscription` accepts either a sealed inscription ID (< JOB-ID-OFFSET) or a draft/job ID (>= JOB-ID-OFFSET).
;; - `get-chunk` accepts either a sealed inscription ID or a job ID.
(define-read-only (get-inscription (id uint))
    (if (is-job-id id)
        (match (map-get? Jobs id)
            job
            (some {
                owner: (get owner job),
                mime-type: (get mime-type job),
                total-size: (get total-size job),
                chunk-count: (get chunk-count job),
                sealed: false,
                merkle-root: 0x00,
                job-id: id
            })
            none
        )
        (map-get? Inscriptions id)
    )
)

(define-read-only (get-chunk (id uint) (index uint))
    (if (is-job-id id)
        (map-get? Chunks { job-id: id, index: index })
        (match (map-get? Inscriptions id)
            meta
            (map-get? Chunks { job-id: (get job-id meta), index: index })
            none
        )
    )
)
