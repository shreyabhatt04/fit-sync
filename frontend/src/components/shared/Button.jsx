import '../../styles/global.css'

function Button({
    children,
    variant = 'primary',
    size = 'md',
    icon,
    iconRight,
    loading = false,
    disabled = false,
    fullWidth = false,
    onClick,
    type = 'button',
    className = '',
}) {
    const variantClass = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        danger: 'btn-danger',
        success: 'btn-success',
        outline: 'btn-outline',
    }[variant] || 'btn-primary'

    const sizeClass = {
        sm: 'btn-sm',
        md: '',
        lg: 'btn-lg',
    }[size] || ''

    return (
        <button
            type={type}
            className={`btn ${variantClass} ${sizeClass} ${fullWidth ? 'w-full' : ''} ${className}`}
            onClick={onClick}
            disabled={disabled || loading}
        >
            {loading ? (
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            ) : (
                icon && <span className="btn-icon-left">{icon}</span>
            )}
            {children}
            {iconRight && !loading && (
                <span className="btn-icon-right">{iconRight}</span>
            )}
        </button>
    )
}

export default Button