// context/ModalContext.jsx
import { createContext, useState, useContext } from "react";

const ModalContext = createContext();

export const useGlobalModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info", // 'success' | 'error' | 'info' | 'added to wishlist'
    buttons: [],
  });

  const showModal = ({ title, message, type = "info", buttons = [] }) => {
    setModalState({ isOpen: true, title, message, type, buttons });

    // ❗Only auto-close if no buttons are provided
    if (buttons.length === 0) {
      setTimeout(() => {
        setModalState((prev) => ({ ...prev, isOpen: false }));
      }, 4000);
    }
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <ModalContext.Provider value={{ ...modalState, showModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
};

