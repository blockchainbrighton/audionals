(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-ALREADY-SEALED (err u101))
(define-constant ERR-NOT-FOUND (err u102))
(define-constant ERR-INVALID-CHUNK (err u103))
(define-constant MAX-CHUNK-SIZE u8192)

(define-data-var next-id uint u0)

(define-map Inscriptions
    uint 
    {
        owner: principal,
        mime-type: (string-ascii 64),
        total-size: uint,
        chunk-count: uint,
        sealed: bool,
        merkle-root: (buff 32)
    }
)

(define-map Chunks { id: uint, index: uint } (buff 8192))

(define-public (begin-inscription (mime (string-ascii 64)) (total-size uint) (chunk-count uint))
    (let ((id (var-get next-id)))
        (map-insert Inscriptions id {
            owner: tx-sender,
            mime-type: mime,
            total-size: total-size,
            chunk-count: chunk-count,
            sealed: false,
            merkle-root: 0x00
        })
        (var-set next-id (+ id u1))
        (ok id)
    ))

(define-public (add-chunk (id uint) (index uint) (data (buff 8192)))
    (let ((meta (unwrap! (map-get? Inscriptions id) ERR-NOT-FOUND)))
        (asserts! (is-eq tx-sender (get owner meta)) ERR-NOT-AUTHORIZED)
        (asserts! (not (get sealed meta)) ERR-ALREADY-SEALED)
        (asserts! (< index (get chunk-count meta)) ERR-INVALID-CHUNK)
        (match (map-insert Chunks {id: id, index: index} data)
            success (ok true)
            error (err u105))))

(define-public (seal-inscription (id uint) (root (buff 32)))
    (let ((meta (unwrap! (map-get? Inscriptions id) ERR-NOT-FOUND)))
        (asserts! (is-eq tx-sender (get owner meta)) ERR-NOT-AUTHORIZED)
        (asserts! (not (get sealed meta)) ERR-ALREADY-SEALED)
        (map-set Inscriptions id (merge meta { sealed: true, merkle-root: root }))
        (ok true)))

(define-read-only (get-inscription (id uint)) (map-get? Inscriptions id))
(define-read-only (get-chunk (id uint) (index uint)) (map-get? Chunks {id: id, index: index}))
