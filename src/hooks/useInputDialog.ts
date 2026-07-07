import { useCallback, useState } from "react";

export interface InputDialogState {
  isOpen: boolean;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  onConfirm?: (value: string) => Promise<void>;
  onCancel?: () => void;
}

const CLOSED_DIALOG: InputDialogState = { isOpen: false, title: "" };

/**
 * Estado del InputDialog global junto con `promptUser`, que abre el diálogo y
 * resuelve con el valor confirmado o `null` si el usuario cancela.
 */
export function useInputDialog() {
  const [inputDialog, setInputDialog] = useState<InputDialogState>(CLOSED_DIALOG);

  const closeInputDialog = useCallback(() => {
    setInputDialog(CLOSED_DIALOG);
  }, []);

  const promptUser = useCallback(
    (
      title: string,
      placeholder: string = "Enter value",
      defaultValue: string = "",
    ): Promise<string | null> => {
      return new Promise((resolve) => {
        setInputDialog({
          isOpen: true,
          title,
          placeholder,
          defaultValue,
          onConfirm: async (value: string) => {
            setInputDialog(CLOSED_DIALOG);
            resolve(value);
          },
          onCancel: () => {
            setInputDialog(CLOSED_DIALOG);
            resolve(null);
          },
        });
      });
    },
    [],
  );

  return { inputDialog, promptUser, closeInputDialog };
}
