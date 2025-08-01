import React from "react";

const AlertModal = ({ 
  isOpen, 
  title, 
  message, 
  type = "info", // success, error, warning, info
  onClose
}) => {
  if (!isOpen) return null;

  const getIconAndColor = () => {
    switch (type) {
      case "success":
        return { icon: "✅", color: "#28a745", bgColor: "#d4edda", borderColor: "#c3e6cb" };
      case "error":
        return { icon: "❌", color: "#dc3545", bgColor: "#f8d7da", borderColor: "#f5c6cb" };
      case "warning":
        return { icon: "⚠️", color: "#ffc107", bgColor: "#fff3cd", borderColor: "#ffeaa7" };
      default:
        return { icon: "ℹ️", color: "#17a2b8", bgColor: "#d1ecf1", borderColor: "#bee5eb" };
    }
  };

  const { icon, color, bgColor, borderColor } = getIconAndColor();

  // Handle click outside to close
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  return (
    <div 
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1001
      }}
      onClick={handleBackdropClick}
    >
      <div style={{
        backgroundColor: "white",
        borderRadius: "8px",
        padding: "24px",
        maxWidth: "400px",
        width: "90%",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
        animation: "alertModalSlideIn 0.3s ease-out",
        border: `2px solid ${borderColor}`
      }}>
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          marginBottom: "16px"
        }}>
          <div style={{
            fontSize: "24px",
            flexShrink: 0,
            marginTop: "2px"
          }}>
            {icon}
          </div>
          <div style={{ flex: 1 }}>
            {title && (
              <h3 style={{
                margin: "0 0 8px 0",
                fontSize: "18px",
                color: "#333",
                fontWeight: "600"
              }}>
                {title}
              </h3>
            )}
            <p style={{
              margin: 0,
              fontSize: "14px",
              color: "#666",
              lineHeight: "1.5",
              whiteSpace: "pre-line"
            }}>
              {message}
            </p>
          </div>
        </div>

        <div style={{
          display: "flex",
          justifyContent: "flex-end"
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              backgroundColor: color,
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.target.style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              e.target.style.opacity = "1";
            }}
          >
            확인
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes alertModalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default AlertModal;