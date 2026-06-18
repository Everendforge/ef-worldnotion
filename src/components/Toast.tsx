import "../App.css";

export interface ToastProps {
  message: string;
  isVisible: boolean;
}

export function Toast({
  message,
  isVisible,
}: ToastProps) {
  if (!isVisible) return null;

  return (
    <div className="toast-container">
      <div className="toast-message">
        {message}
      </div>
    </div>
  );
}
