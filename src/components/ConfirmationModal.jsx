import React from "react";

const ConfirmationModal = ({ 
  isOpen, 
  title, 
  message, 
  confirmText = "확인", 
  cancelText = "취소", 
  onConfirm, 
  onCancel,
  type = "warning" // warning, danger, info
}) => {
  if (!isOpen) return null;

  const getIconAndColor = () => {
    switch (type) {
      case "danger":
        return { icon: "🗑️", color: "#dc3545" };
      case "info":
        return { icon: "ℹ️", color: "#17a2b8" };
      default:
        return { icon: "⚠️", color: "#ffc107" };
    }
  };

  const { icon, color } = getIconAndColor();

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: "white",
        borderRadius: "8px",
        padding: "24px",
        maxWidth: "400px",
        width: "90%",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
        animation: "modalSlideIn 0.2s ease-out"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px"
        }}>
          <span style={{ fontSize: "24px" }}>{icon}</span>
          <h3 style={{
            margin: 0,
            fontSize: "18px",
            color: "#333",
            fontWeight: "600"
          }}>
            {title}
          </h3>
        </div>

        <p style={{
          margin: "0 0 24px 0",
          fontSize: "14px",
          color: "#666",
          lineHeight: "1.5",
          whiteSpace: "pre-line"
        }}>
          {message}
        </p>

        <div style={{
          display: "flex",
          gap: "12px",
          justifyContent: "flex-end"
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              backgroundColor: "#f8f9fa",
              color: "#333",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#e9ecef";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#f8f9fa";
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "8px 16px",
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
            {confirmText}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes modalSlideIn {
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

export default ConfirmationModal;