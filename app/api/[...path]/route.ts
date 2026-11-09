import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {createApi} from '../../../lib/api-handler';
export const dynamic='force-dynamic';
const handle=createApi({env,getUser:()=>getChatGPTUser(),authProvider:'sites'});
export const GET=handle;export const POST=handle;export const PATCH=handle;export const DELETE=handle;
