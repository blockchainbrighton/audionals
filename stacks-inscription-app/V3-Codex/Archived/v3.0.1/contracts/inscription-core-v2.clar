(define-constant CONTRACT-VERSION u2)

;; Error codes (keep v1 codes stable where possible)
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-ALREADY-SEALED (err u101))
(define-constant ERR-NOT-FOUND (err u102))
(define-constant ERR-INVALID-CHUNK (err u103))
(define-constant ERR-DUPLICATE-CHUNK (err u105))

(define-constant MAX-CHUNK-SIZE u8192)
(define-constant EMPTY-ROOT 0x0000000000000000000000000000000000000000000000000000000000000000)
(define-constant PAGE-SIZE u16)
(define-constant PAGE-INDICES (list u16 uint u0 u1 u2 u3 u4 u5 u6 u7 u8 u9 u10 u11 u12 u13 u14 u15))

(define-data-var next-id uint u0)

(define-map Inscriptions
  uint
  {
    owner: principal,
    mime-type: (string-ascii 64),
    total-size: uint,
    chunk-count: uint,
    sealed: bool,
    merkle-root: (buff 32),
    created-at: uint,
    sealed-at: uint
  }
)

(define-map Chunks { id: uint, index: uint } (buff 8192))

;; --------------------------
;; Write path (compatible)
;; --------------------------

(define-public (begin-inscription (mime (string-ascii 64)) (total-size uint) (chunk-count uint))
  (let ((id (var-get next-id)))
    (map-insert Inscriptions id {
      owner: tx-sender,
      mime-type: mime,
      total-size: total-size,
      chunk-count: chunk-count,
      sealed: false,
      merkle-root: EMPTY-ROOT,
      created-at: block-height,
      sealed-at: u0
    })
    (var-set next-id (+ id u1))
    (ok id)
  )
)

(define-public (add-chunk (id uint) (index uint) (data (buff 8192)))
  (let ((meta (unwrap! (map-get? Inscriptions id) ERR-NOT-FOUND)))
    (asserts! (is-eq tx-sender (get owner meta)) ERR-NOT-AUTHORIZED)
    (asserts! (not (get sealed meta)) ERR-ALREADY-SEALED)
    (asserts! (< index (get chunk-count meta)) ERR-INVALID-CHUNK)
    (asserts! (map-insert Chunks {id: id, index: index} data) ERR-DUPLICATE-CHUNK)
    (ok true)
  )
)

(define-public (seal-inscription (id uint) (root (buff 32)))
  (let ((meta (unwrap! (map-get? Inscriptions id) ERR-NOT-FOUND)))
    (asserts! (is-eq tx-sender (get owner meta)) ERR-NOT-AUTHORIZED)
    (asserts! (not (get sealed meta)) ERR-ALREADY-SEALED)
    (map-set Inscriptions id (merge meta { sealed: true, merkle-root: root, sealed-at: block-height }))
    (ok true)
  )
)

;; --------------------------
;; Read path (batch + UX)
;; --------------------------

(define-read-only (get-contract-version) CONTRACT-VERSION)
(define-read-only (get-page-size) PAGE-SIZE)
(define-read-only (get-max-chunk-size) MAX-CHUNK-SIZE)
(define-read-only (get-next-id) (var-get next-id))

(define-read-only (get-inscription (id uint))
  (map-get? Inscriptions id)
)

(define-read-only (get-chunk (id uint) (index uint))
  (map-get? Chunks {id: id, index: index})
)

;; Fetch a page of 16 inscription metas at IDs: (page*16) .. (page*16+15)
(define-read-only (get-inscriptions-page (page uint))
  (let ((base (* page PAGE-SIZE)))
    (map (lambda (i) (map-get? Inscriptions (+ base i))) PAGE-INDICES)
  )
)

;; Fetch a page of 16 chunk buffers for an inscription at chunk indexes: (page*16) .. (page*16+15)
;; Returns `none` for out-of-range indexes or missing chunks; returns `none` for the whole call if id not found.
(define-read-only (get-chunks-page (id uint) (page uint))
  (match (map-get? Inscriptions id)
    meta
    (let ((base (* page PAGE-SIZE))
          (count (get chunk-count meta)))
      (some
        (map
          (lambda (i)
            (let ((idx (+ base i)))
              (if (< idx count)
                (map-get? Chunks {id: id, index: idx})
                none)))
          PAGE-INDICES)))
    none
  )
)

;; Fast existence scan for resuming: 16 booleans for chunk indexes in the page.
(define-read-only (get-chunk-exists-page (id uint) (page uint))
  (match (map-get? Inscriptions id)
    meta
    (let ((base (* page PAGE-SIZE))
          (count (get chunk-count meta)))
      (some
        (map
          (lambda (i)
            (let ((idx (+ base i)))
              (and (< idx count) (is-some (map-get? Chunks {id: id, index: idx})))))
          PAGE-INDICES)))
    none
  )
)
