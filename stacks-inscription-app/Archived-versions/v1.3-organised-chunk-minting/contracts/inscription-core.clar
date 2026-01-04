(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-ALREADY-SEALED (err u101))
(define-constant ERR-NOT-FOUND (err u102))
(define-constant ERR-INVALID-CHUNK (err u103))
(define-constant MAX-CHUNK-SIZE u8192)

(define-data-var next-upload-id uint u0)
(define-data-var next-inscription-number uint u0)

(define-map Inscriptions
    uint 
    {
        owner: principal,
        mime-type: (string-ascii 64),
        total-size: uint,
        chunk-count: uint,
        sealed: bool,
        merkle-root: (buff 32),
        number: (optional uint)
    }
)

(define-map InscriptionNumberToId uint uint)

(define-map Chunks { id: uint, index: uint } (buff 8192))

(define-public (begin-inscription (mime (string-ascii 64)) (total-size uint) (chunk-count uint) (root (buff 32)))
    (let ((id (var-get next-upload-id)))
        (map-insert Inscriptions id {
            owner: tx-sender,
            mime-type: mime,
            total-size: total-size,
            chunk-count: chunk-count,
            sealed: false,
            merkle-root: root,
            number: none
        })
        (var-set next-upload-id (+ id u1))
        (ok id)
    ))

(define-public (add-chunk (id uint) (index uint) (data (buff 8192)))
    (let ((meta (unwrap! (map-get? Inscriptions id) ERR-NOT-FOUND)))
        (asserts! (is-eq tx-sender (get owner meta)) ERR-NOT-AUTHORIZED)
        (asserts! (not (get sealed meta)) ERR-ALREADY-SEALED)
        (asserts! (< index (get chunk-count meta)) ERR-INVALID-CHUNK)
        (asserts! (map-insert Chunks {id: id, index: index} data) (err u105))
        (ok true)))

(define-private (batch-add-helper (entry {id: uint, index: uint, data: (buff 8192)}))
    (add-chunk (get id entry) (get index entry) (get data entry))
)

(define-public (add-batch (entries (list 6 {id: uint, index: uint, data: (buff 8192)})))
    (ok (map batch-add-helper entries))
)

(define-public (seal-inscription (id uint))
    (let (
        (meta (unwrap! (map-get? Inscriptions id) ERR-NOT-FOUND))
        (number (var-get next-inscription-number))
    )
        (asserts! (is-eq tx-sender (get owner meta)) ERR-NOT-AUTHORIZED)
        (asserts! (not (get sealed meta)) ERR-ALREADY-SEALED)
        
        ;; Assign the sequential number
        (map-set Inscriptions id (merge meta { sealed: true, number: (some number) }))
        (map-insert InscriptionNumberToId number id)
        
        (var-set next-inscription-number (+ number u1))
        (ok number)))

(define-read-only (get-inscription (id uint)) (map-get? Inscriptions id))
(define-read-only (get-chunk (id uint) (index uint)) (map-get? Chunks {id: id, index: index}))

(define-read-only (get-inscription-by-number (number uint))
    (match (map-get? InscriptionNumberToId number)
        id (map-get? Inscriptions id)
        none
    ))

(define-read-only (get-id-by-number (number uint))
    (map-get? InscriptionNumberToId number))

