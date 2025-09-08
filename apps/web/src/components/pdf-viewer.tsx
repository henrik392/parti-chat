'use client';

import { ExternalLinkIcon, XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Set up the worker for react-pdf using local assets
if (typeof window !== 'undefined') {
  // Try to use a working jsdelivr CDN first
  const workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  // Enable verbose logging for react-pdf debugging
  console.log('PDF.js version:', pdfjs.version);
  console.log('PDF.js worker src:', workerSrc);

  // Test worker accessibility with a simple approach
  console.log('Testing PDF.js worker availability...');
}

type PDFViewerProps = {
  isOpen: boolean;
  onClose: () => void;
  pdfPath: string;
  initialPage?: number;
  externalUrl?: string;
  partyName?: string;
};

export function PDFViewer({
  isOpen,
  onClose,
  pdfPath,
  initialPage = 1,
  externalUrl,
  partyName,
}: PDFViewerProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset loading state when dialog opens
  useEffect(() => {
    if (isOpen) {
      console.log('PDF Viewer opened - resetting states');
      console.log('PDF path to load:', pdfPath);
      console.log('Initial page:', initialPage);
      setIsLoading(true);
      setError(null);

      // Test PDF accessibility
      if (typeof window !== 'undefined') {
        console.log('Testing PDF URL accessibility...');
        fetch(pdfPath)
          .then((response) => {
            console.log('PDF fetch response:', {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              url: response.url,
            });
            if (response.ok) {
              console.log('PDF is accessible via fetch');
            } else {
              console.error(
                'PDF not accessible:',
                response.status,
                response.statusText
              );
            }
            return response.blob();
          })
          .then((blob) => {
            console.log('PDF blob size:', blob.size, 'bytes');
            console.log('PDF blob type:', blob.type);
          })
          .catch((error) => {
            console.error('PDF fetch failed:', error);
          });
      }
    }
  }, [isOpen, pdfPath, initialPage]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('PDF loaded successfully!', {
      numPages,
      pdfPath,
      initialPage,
    });
    setNumPages(numPages);
    setCurrentPage(initialPage);
    setIsLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF loading error:', error);
    console.error('PDF path attempted:', pdfPath);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      cause: error.cause,
    });
    setError(`Kunne ikke laste PDF-filen: ${error.message}`);
    setIsLoading(false);
  };

  const onDocumentLoadStart = () => {
    console.log('PDF loading started for:', pdfPath);
  };

  const onDocumentLoadProgress = (progressData: any) => {
    console.log('PDF loading progress:', progressData);
  };

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, numPages || 1));
  };

  const openExternalLink = () => {
    if (externalUrl) {
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog onOpenChange={onClose} open={isOpen}>
      <DialogContent className="max-h-[90vh] max-w-4xl p-0">
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-semibold text-lg">
              {partyName ? `${partyName} - Partiprogram` : 'Partiprogram'}
              {currentPage && numPages && (
                <span className="ml-2 font-normal text-muted-foreground text-sm">
                  (side {currentPage} av {numPages})
                </span>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {externalUrl && (
                <Button
                  className="flex items-center gap-1"
                  onClick={openExternalLink}
                  size="sm"
                  variant="outline"
                >
                  <ExternalLinkIcon className="h-3 w-3" />
                  Se original
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {error ? (
            <div className="flex h-96 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p>{error}</p>
                {externalUrl && (
                  <Button
                    className="mt-2"
                    onClick={openExternalLink}
                    variant="link"
                  >
                    Se PDF på partiets nettside
                  </Button>
                )}
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex h-96 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-gray-900 border-b-2" />
                <p className="text-muted-foreground">Laster PDF...</p>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              {/* PDF Document */}
              <div className="flex-1 overflow-auto bg-gray-100 p-4">
                <div className="flex justify-center">
                  <Document
                    className="shadow-lg"
                    file={pdfPath}
                    onLoadError={onDocumentLoadError}
                    onLoadProgress={onDocumentLoadProgress}
                    onLoadStart={onDocumentLoadStart}
                    onLoadSuccess={onDocumentLoadSuccess}
                    options={{
                      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
                      cMapPacked: true,
                    }}
                  >
                    <Page
                      className="mx-auto"
                      loading={
                        <div className="flex h-96 items-center justify-center">
                          <div className="text-center">
                            <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-gray-900 border-b-2" />
                            <p className="text-muted-foreground">
                              Laster side {currentPage}...
                            </p>
                          </div>
                        </div>
                      }
                      onRenderError={(error) => {
                        console.error('Page render error:', error);
                      }}
                      onRenderSuccess={() => {
                        console.log('Page rendered successfully:', currentPage);
                      }}
                      pageNumber={currentPage}
                      width={Math.min(window.innerWidth * 0.8, 800)}
                    />
                  </Document>
                </div>
              </div>

              {/* Navigation Controls */}
              {numPages && numPages > 1 && (
                <div className="flex items-center justify-center gap-4 border-t bg-white p-4">
                  <Button
                    disabled={currentPage <= 1}
                    onClick={goToPrevPage}
                    variant="outline"
                  >
                    Forrige
                  </Button>
                  <span className="text-muted-foreground text-sm">
                    Side {currentPage} av {numPages}
                  </span>
                  <Button
                    disabled={currentPage >= numPages}
                    onClick={goToNextPage}
                    variant="outline"
                  >
                    Neste
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
