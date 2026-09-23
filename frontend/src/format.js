/** Number formatting shared by pages and charts. Kept out of the component file so
 *  React Fast Refresh sees components-only modules. */
export const inr = (cr) => `₹${Number(cr || 0).toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr`
export const num = (n) => Number(n || 0).toLocaleString('en-IN')
