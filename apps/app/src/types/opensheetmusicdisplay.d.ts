declare module "opensheetmusicdisplay" {
  export type OSMDOptions = Record<string, unknown>;

  export class OpenSheetMusicDisplay {
    constructor(container: HTMLElement, options?: OSMDOptions);
    Zoom: number;
    load(content: string): Promise<void>;
    render(): void;
    clear(): void;
  }
}
