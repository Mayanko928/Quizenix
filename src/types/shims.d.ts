declare module "mammoth/mammoth.browser" {
  const value: {
    extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string; messages: unknown[] }>;
  };
  export default value;
  export const extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string; messages: unknown[] }>;
}

declare module "pdfjs-dist/build/pdf.worker.min.mjs?url" {
  const url: string;
  export default url;
}
