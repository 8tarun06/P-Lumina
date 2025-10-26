import { AnimatePresence, motion } from "framer-motion";
import { useGlobalModal } from "../context/ModalContext";
import { CheckCircle, AlertTriangle, Info } from "lucide-react";
import "../globalmodal.css";

const GlobalModal = () => {
  const {
    isOpen,
    title,
    message,
    type,
    buttons = [],
    closeModal,
  } = useGlobalModal();

  console.log("Rendering modal with buttons:", buttons); // Debug

  const iconMap = {
    success: <CheckCircle size={40} color="#00ff0dff" />,
    error: <AlertTriangle size={40} color="#e53935" />,
    info: <Info size={40} color="#1e88e5" />,
    warning: <AlertTriangle size={40} color="#f5a623" />,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <motion.div
            className={`modal-container ${type}`}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: -100, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="modal-icon">{iconMap[type]}</div>
            <h3>{title}</h3>
            <p>{message}</p>

            {buttons?.length > 0 && (
              <div className="modal-buttons" style={{ padding: "20px" }}>
                {buttons.map((button, index) => (
                  <button
                    key={index}
                    className={`modal-button ${
                      button.variant || (index === 0 ? "primary" : "secondary")
                    }`}
                    onClick={() => {
                      if (button.handler) button.handler();
                      if (button.closeOnClick !== false) closeModal();
                    }}
                  >
                    {button.text}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default GlobalModal;
