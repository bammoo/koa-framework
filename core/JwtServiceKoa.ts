import koaJwt from 'koa-jwt'
import jsonwebtoken from 'jsonwebtoken'

import {rd} from '../lib/redis'

import { AuthTimeoutError, MissingParamError } from '../lib/error';
import { Context } from 'koa';

export class JwtService {

  private readonly _key: string;
  private readonly _secret: string;
  private readonly _middleware: any;

  constructor(key: string, secret: string) {
      this._key = key;
      this._secret = secret;
      this._middleware = koaJwt({
        secret: this._secret,
        getToken: this.fromHeaderOrQuerystring
      })
  }

  public getMiddleware(): any {
    return this._middleware
  }

  private fromHeaderOrQuerystring = (ctx: Context): string  =>{
    let token = null
    if (ctx.headers.authorization) {
      const authString = ctx.headers.authorization.split(' ')
      if(authString[0] === this._key)
        token = authString[1];
    } else if (ctx.query && ctx.query.token) {
      token = ctx.query.token;
    }
    return token;
  }

  public getJwtPayload(ctx: Context) {
    const token = this.fromHeaderOrQuerystring(ctx)
    const decoded = jsonwebtoken.verify(token, this._secret)
    return decoded
  }

  public async checkSession(ctx: Context) {
    const tok = this.fromHeaderOrQuerystring(ctx)
    if(!tok) {
      throw new MissingParamError()
    }
    const data = await rd.get(tok)
    if (data) {
      // token 在 redis 中存在，延长过期时间
      rd.updateExpire(tok)
      return true
    } else {
      return false
    }
  }

  public checkSessionMiddleware = (ctx: Context, next) => {
    const session = this.checkSession(ctx)
    if(session) {
      next()
    }
    else {
      next(new AuthTimeoutError())
    }
  }

  public jwtsign(data) {
    return jsonwebtoken.sign(data, this._secret)
  }
  
  public addSession(tok: String): void {
    tok && rd.set(tok)
  }
  
  public removeSession(ctx: Context): void {
    const tok = this.fromHeaderOrQuerystring(ctx)
    tok && rd.remove(tok)
  }

}
