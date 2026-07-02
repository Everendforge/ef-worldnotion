import { ChevronRight } from "lucide-react";

interface BreadcrumbsProps {
  filePath: string;
  onNavigateFolder?: (path: string) => void;
}

export function Breadcrumbs({ filePath, onNavigateFolder }: BreadcrumbsProps) {
  // Split path into segments
  const pathSegments = filePath.split("/").filter(Boolean);

  // Build folder path segments (excluding filename)
  const folderSegments = pathSegments.slice(0, -1);
  const fileName = pathSegments[pathSegments.length - 1];

  return (
    <div className="breadcrumbs">
      <div className="breadcrumbs-path">
        {/* Folder segments */}
        {folderSegments.map((segment, index) => {
          const segmentPath = folderSegments.slice(0, index + 1).join("/");
          return (
            <span key={`folder-${index}`} className="breadcrumb-segment">
              {onNavigateFolder ? (
                <button
                  type="button"
                  className="breadcrumb-link"
                  onClick={() => onNavigateFolder(segmentPath)}
                  title={segmentPath}
                >
                  {segment}
                </button>
              ) : (
                <span className="breadcrumb-text">{segment}</span>
              )}
              <ChevronRight size={14} className="breadcrumb-separator" />
            </span>
          );
        })}

        {/* File name */}
        <span className="breadcrumb-segment breadcrumb-current">
          <span className="breadcrumb-text">{fileName}</span>
        </span>
      </div>
    </div>
  );
}
