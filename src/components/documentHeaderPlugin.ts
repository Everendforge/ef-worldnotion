import { Decoration, DecorationSet, WidgetType, ViewPlugin } from "@codemirror/view";
import { Extension } from "@codemirror/state";

export type DocumentHeaderConfig = {
  documentName?: string;
  projectName?: string;
  showProjectName: boolean;
};

class DocumentHeaderWidget extends WidgetType {
  constructor(
    readonly documentName: string,
    readonly projectName: string | undefined,
    readonly showProjectName: boolean
  ) {
    super();
  }

  toDOM() {
    const header = document.createElement("div");
    header.className = "document-header";

    const titleEl = document.createElement("span");
    titleEl.className = "document-header-title";
    titleEl.textContent = this.documentName;
    header.appendChild(titleEl);

    if (this.showProjectName && this.projectName) {
      const separator = document.createElement("span");
      separator.textContent = " • ";
      header.appendChild(separator);

      const projectEl = document.createElement("span");
      projectEl.className = "document-header-project";
      projectEl.textContent = this.projectName;
      header.appendChild(projectEl);
    }

    return header;
  }

  ignoreEvent() {
    return false;
  }
}

function createDecorations(config: DocumentHeaderConfig) {
  if (!config.documentName) {
    return Decoration.set([]);
  }

  const widget = new DocumentHeaderWidget(
    config.documentName,
    config.projectName,
    config.showProjectName
  );

  return Decoration.set([
    Decoration.widget({
      widget,
      side: -1,
    }).range(0),
  ]);
}

export function createDocumentHeaderPlugin(config: DocumentHeaderConfig): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      config: DocumentHeaderConfig;

      constructor() {
        this.config = config;
        this.decorations = createDecorations(config);
      }

      update() {
        // Update decorations if needed
        this.decorations = createDecorations(this.config);
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );
}
