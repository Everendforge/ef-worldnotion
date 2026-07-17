import { useCallback, useState } from "react";
import type {
  InheritAppearanceChoice,
  InheritAppearanceOption,
} from "../components/InheritAppearanceDialog";

export interface InheritAppearanceDialogState {
  isOpen: boolean;
  options: InheritAppearanceOption[];
  onConfirm?: (choice: InheritAppearanceChoice) => void;
  onCancel?: () => void;
}

const CLOSED_DIALOG: InheritAppearanceDialogState = { isOpen: false, options: [] };

/**
 * Promise-based prompt asking which universe's appearance (theme, editor,
 * explorer, graph, plugins, AI advisor, keybindings) a new universe should
 * start from. Resolves `null` when the user cancels universe creation itself.
 */
export function useInheritAppearanceDialog() {
  const [inheritAppearanceDialog, setInheritAppearanceDialog] =
    useState<InheritAppearanceDialogState>(CLOSED_DIALOG);

  const closeInheritAppearanceDialog = useCallback(() => {
    setInheritAppearanceDialog(CLOSED_DIALOG);
  }, []);

  const chooseAppearanceSource = useCallback(
    (options: InheritAppearanceOption[]): Promise<InheritAppearanceChoice | null> => {
      return new Promise((resolve) => {
        setInheritAppearanceDialog({
          isOpen: true,
          options,
          onConfirm: (choice) => {
            setInheritAppearanceDialog(CLOSED_DIALOG);
            resolve(choice);
          },
          onCancel: () => {
            setInheritAppearanceDialog(CLOSED_DIALOG);
            resolve(null);
          },
        });
      });
    },
    [],
  );

  return { inheritAppearanceDialog, chooseAppearanceSource, closeInheritAppearanceDialog };
}
