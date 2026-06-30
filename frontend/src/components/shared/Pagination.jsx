function Pagination({ page, totalPages, totalItems, onPageChange }) {
    if (totalPages <= 1) return null

    const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

    return (
        <div className="pagination">
            <span>Showing page {page} of {totalPages} ({totalItems} records)</span>
            <div className="pagination-controls">
                <button
                    className="pagination-btn"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                {pages.map((p) => (
                    <button
                        key={p}
                        className={`pagination-btn ${p === page ? 'active' : ''}`}
                        onClick={() => onPageChange(p)}
                    >
                        {p}
                    </button>
                ))}
                <button
                    className="pagination-btn"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === totalPages}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </button>
            </div>
        </div>
    )
}

export default Pagination