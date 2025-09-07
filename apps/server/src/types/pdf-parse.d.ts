declare module 'pdf-parse' {
  type PDFData = {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown>;
    text: string;
    version: string;
  };

  function parse(
    buffer: Buffer,
    options?: Record<string, unknown>
  ): Promise<PDFData>;
  export = parse;
}
