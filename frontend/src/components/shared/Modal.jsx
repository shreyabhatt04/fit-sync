import { useEffect } from 'react'
import '../../styles/global.css'

function Modal({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
}) {
    // Close on Escape key
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [isOpen, onClose])

    // Prevent body scroll when modal open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div
            className="modal-overlay"
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className={`modal ${size === 'lg' ? 'modal-lg' : ''}`}>
                <div className="modal-header">
                    <h3 className="modal-title">{title}</h3>
                    <button className="modal-close" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
                {footer && (
                    <div className="modal-footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )
}

export default Modal