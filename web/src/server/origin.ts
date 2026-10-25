import 'server-only';
import { AnalysisError } from './errors';
/** Match the browser's original authority, not a framework-internal localhost URL. */
export function assertSameOrigin(request:Request, canonicalOrigin=process.env.APP_ORIGIN) {
 if(request.headers.get('sec-fetch-site')==='cross-site') throw new AnalysisError('FORBIDDEN');
 const origin=request.headers.get('origin');
 if(!origin)return; // Non-browser clients are still governed by the private deployment boundary.
 try {
  const url=new URL(request.url);
  const expected=canonicalOrigin?new URL(canonicalOrigin).origin:new URL(`${url.protocol}//${request.headers.get('host')??url.host}`).origin;
  if(origin!==expected)throw new Error('origin');
 }catch{throw new AnalysisError('FORBIDDEN');}
}
