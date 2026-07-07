import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import { MessageDialog } from "./MessageDialog";
import { InputDialog } from "./InputDialog";

export interface ConfirmDialogOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export interface AlertDialogOptions {
  title?: string;
}

export type ConfirmDialogFn = (message: string, options?: ConfirmDialogOptions) => Promise<boolean>;
export type AlertDialogFn = (message: string, options?: AlertDialogOptions) => Promise<void>;
export type PromptDialogFn = (
  title: string,
  placeholder?: string,
  defaultValue?: string,
) => Promise<string | null>;

interface DialogContextValue {
  confirmDialog: ConfirmDialogFn;
  alertDialog: AlertDialogFn;
  promptDialog: PromptDialogFn;
}

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

/**
 * Diálogos de aplicación (confirmación, aviso y entrada de texto) como
 * promesas. Sustituyen a window.alert/confirm/prompt, que son no-ops en
 * algunos webviews de Tauri y rompen la coherencia visual.
 */
export function useAppDialogs(): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) throw new Error("useAppDialogs must be used within a DialogProvider");
  return context;
}

type ConfirmState = {
  message: string;
  options?: ConfirmDialogOptions;
  resolve: (confirmed: boolean) => void;
};

type AlertState = {
  message: string;
  options?: AlertDialogOptions;
  resolve: () => void;
};

type PromptState = {
  title: string;
  placeholder?: string;
  defaultValue?: string;
  resolve: (value: string | null) => void;
};

export function DialogProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [alertState, setAlertState] = useState<AlertState | null>(null);
  const [promptState, setPromptState] = useState<PromptState | null>(null);

  const confirmDialog = useCallback<ConfirmDialogFn>((message, options) => {
    return new Promise((resolve) => {
      setConfirmState({ message, options, resolve });
    });
  }, []);

  const alertDialog = useCallback<AlertDialogFn>((message, options) => {
    return new Promise((resolve) => {
      setAlertState({ message, options, resolve });
    });
  }, []);

  const promptDialog = useCallback<PromptDialogFn>((title, placeholder, defaultValue) => {
    return new Promise((resolve) => {
      setPromptState({ title, placeholder, defaultValue, resolve });
    });
  }, []);

  const value = useMemo(
    () => ({ confirmDialog, alertDialog, promptDialog }),
    [confirmDialog, alertDialog, promptDialog],
  );

  return (
    <DialogContext.Provider value={value}>
      {children}
      <ConfirmDialog
        isOpen={confirmState !== null}
        message={confirmState?.message ?? ""}
        title={confirmState?.options?.title}
        confirmLabel={confirmState?.options?.confirmLabel}
        cancelLabel={confirmState?.options?.cancelLabel}
        destructive={confirmState?.options?.destructive}
        onConfirm={() => {
          confirmState?.resolve(true);
          setConfirmState(null);
        }}
        onCancel={() => {
          confirmState?.resolve(false);
          setConfirmState(null);
        }}
      />
      <MessageDialog
        isOpen={alertState !== null}
        message={alertState?.message ?? ""}
        title={alertState?.options?.title}
        onClose={() => {
          alertState?.resolve();
          setAlertState(null);
        }}
      />
      <InputDialog
        isOpen={promptState !== null}
        title={promptState?.title ?? ""}
        placeholder={promptState?.placeholder}
        defaultValue={promptState?.defaultValue}
        onConfirm={async (inputValue) => {
          promptState?.resolve(inputValue);
          setPromptState(null);
        }}
        onCancel={() => {
          promptState?.resolve(null);
          setPromptState(null);
        }}
      />
    </DialogContext.Provider>
  );
}
