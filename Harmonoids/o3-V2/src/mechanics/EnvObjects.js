/**
 * Simple solid tiles / decorative objects.
 * @module mechanics/EnvObjects
 */
export class EnvObjects {
  /** @param {{x:number,y:number,w:number,h:number,color?:string,solid?:boolean}} opts */
  constructor(opts) {
    Object.assign(this, opts);
    if (this.solid === undefined) this.solid = true;
  }
}

// Optional alias so existing imports of `EnvObject` (if any) keep working.
export { EnvObjects as EnvObject };
