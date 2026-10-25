import { expect, it } from 'vitest';
import { assertSameOrigin } from '../../src/server/origin';
it('accepts the original browser host when the framework rewrites the request URL',()=>{expect(()=>assertSameOrigin(new Request('http://localhost:3000/api/analyze',{headers:{host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000','sec-fetch-site':'same-origin'}}))).not.toThrow();});
it('rejects foreign origins and ignores forwarded host spoofing',()=>{expect(()=>assertSameOrigin(new Request('https://app.example/api/analyze',{headers:{host:'app.example',origin:'https://evil.example','x-forwarded-host':'evil.example'}}))).toThrow();});
it('rejects cross-site posts even when the origin is absent',()=>{expect(()=>assertSameOrigin(new Request('https://app.example/api/analyze',{headers:{'sec-fetch-site':'cross-site'}}))).toThrow();});
it('accepts a configured external origin behind TLS termination',()=>{expect(()=>assertSameOrigin(new Request('http://localhost:8080/api/analyze',{headers:{origin:'https://demo.example'}}),'https://demo.example')).not.toThrow();});
it('rejects an internal authority when a canonical application origin is configured',()=>{expect(()=>assertSameOrigin(new Request('http://localhost:8080/api/analyze',{headers:{origin:'http://localhost:8080'}}),'https://demo.example')).toThrow();});
