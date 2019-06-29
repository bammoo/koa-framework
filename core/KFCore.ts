import 'reflect-metadata'
import Koa from 'koa'
import Router from 'koa-router'
import bodyParser from 'koa-bodyparser'
import morgan from 'koa-morgan'

import {JwtService} from './JwtServiceKoa'
import {logger} from '../lib/logger'
import { controllerList, controllerActionList, authList, middlewareList, paramsList } from '../lib/decorator'

type Constructor<T = any> = new (...args: any[]) => T;

export class KFCore {
  private readonly app: Koa;
  private developmentMode: boolean;
  private _jwtService: JwtService;
  
  constructor({
    env,
    jwtServiceInstance,
  }) {
    const {bodyLimit, corsHeaders} = env
    this._jwtService = jwtServiceInstance

    this.developmentMode = process.env.NODE_ENV !== "production";
    let app = this.app = new Koa()

    // app.use(koaPino({level: 'error'}))
    app.use(morgan('dev'))

    app.use(bodyParser())

    this.addErrorHandler()

    this.initController()

  }

  private provideFactory<T>(target: Constructor<T>): T {
    // 获取所有注入的服务
    const providers = Reflect.getMetadata('design:paramtypes', target); // [OtherService]
    if(!providers) {
      return new target()
    }
    const args = providers.map((provider: Constructor) => {
      switch (provider) {
        // case JwtService:
        //   return this._jwtService
        //   break;
      
        default:
          break;
      }
      return new provider()
    });
    return new target(...args);
  }

  private initController() {
    const router: Router = new Router()
    // logger.info('mmm', 'controllerList', controllerList)
    controllerList.forEach((controllerItem) => {
      const {Cls} = controllerItem

      const thisActions = controllerActionList.filter(item => item.target.name === Cls.name)
      // console.log('mmm', 'clsname', Cls.name, thisActions)
      
      thisActions.forEach(this.registerAction(controllerItem, router))
    })

    this.app.use(router.routes())
    this.app.use(router.allowedMethods());
  }

  private registerAction(controllerItem, router) {
    const {basePath, Cls} = controllerItem

    const controller = this.provideFactory(Cls)

    return controllerAction => {
      const {method, httpVerb, path} = controllerAction
      const findFunc = (item) => item.target.name === Cls.name && method === item.method
      
      const routeHandler = async (ctx, next) => {
        const thisParams = paramsList.filter(findFunc)
        const routeFunc = controller[method]
        let arg = []
        if(thisParams) {
          thisParams.forEach(paramOption => {
            let value
            if (paramOption.paramType === "currentUser")
              value = this._jwtService.getJwtPayload(ctx);
            else if (paramOption.paramType === "context")
              value = ctx;
            else if (paramOption.paramType === "request")
              value = ctx.request;
            else
              value = this.getParamFromRequest(ctx, paramOption)
            arg.unshift(value)
          })
        }

        const result = routeFunc.apply(controller, arg)
        if(result && result.then) {
          const data = await result.catch(error => {
            throw error
          })
          ctx.body = data
        }
        else {
          ctx.body = result
        }
      }

      let curMiddlewareList = []
      const thisAuth = authList.find(findFunc)
      if(!thisAuth || thisAuth.authType !== 'public') {
        curMiddlewareList.push(
          this._jwtService.getMiddleware(), 
          this._jwtService.checkSessionMiddleware
        )
      }
      // const roleOption = roleList.find(findFunc)
      // if(roleOption && roleOption.roleName) {
      //   curMiddlewareList.push(checkRoleMiddleware(roleOption.roleName))
      // }

      const thisMiddleware = middlewareList.find(findFunc)
      // Middleware decorator
      if(thisMiddleware && thisMiddleware.middleware) {
        if(Array.isArray(thisMiddleware.middleware)) {
          curMiddlewareList = curMiddlewareList.concat(thisMiddleware.middleware)
        }
        else
          curMiddlewareList.push(thisMiddleware.middleware)
      }

      console.log('mmm', '', curMiddlewareList.length, basePath + path)
      if (curMiddlewareList.length) {
        router[httpVerb](basePath + path, ...curMiddlewareList, routeHandler);
      } else {
        router[httpVerb](basePath + path, routeHandler);
      }

    }
  }

  private addErrorHandler() {

    const errorHandler = (err, req, res, next) => {
      res.status(err.status || 500)

      if (err instanceof Error) {
        res.json({
          name: err.name,
          message: err.message
        })
        return
      }
    }

    this.app.use(async (ctx, next) => {
      try {
        await next();
      } catch (err) {
        // will only respond with JSON
        ctx.status = err.statusCode || err.status || 500;
        ctx.body = {
          name: err.name,
          message: err.message,
        };
        console.log('mmm', 'err.stack', err.stack)
      }
    })
  }
  
  /**
   * Gets param from the request.
   */
  private getParamFromRequest(context: any, param: any): any {
    switch (param.paramType) {
      case "body":
          return context.request.body;

      case "body-param":
          return context.request.body[param.paramName];

      case "param":
          return context.params[param.paramName];

      case "params":
          return context.params;

      case "query":
        return context.query[param.paramName];

      case "queries":
          return context.query;

      case "header":
        return context.headers[param.paramName.toLowerCase()];

      case "headers":
        return context.headers;

      case "file":
        return context.req.file;

      case "files":
        return context.req.files;
    }
  }

  public startServer(PORT) {
    this.app.listen(PORT, () => {
      logger.info(`Started on port ${PORT}`)
    })
  }
}
