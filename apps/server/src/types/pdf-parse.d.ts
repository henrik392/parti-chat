declare module 'pdf-parse' {
  type PDFData = {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
  };

  function parse(buffer: Buffer, options?: any): Promise<PDFData>;
  export = parse;
}
