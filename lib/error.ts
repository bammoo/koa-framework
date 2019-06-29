

export class KFCoreError extends Error {
  status: number;
  name = 'KFCoreError';
  constructor(message) {
    super(message);
  }
}

export class ResourceNotFoundError extends KFCoreError {
  name = 'ResourceNotFoundError';
  constructor(resource?: string) {
    super(`Resource ${resource} was not found.`);
  }
}

export class ObjectAlreadyExistError extends KFCoreError {
  name = 'ObjectAlreadyExistError';
  constructor(resource) {
    super(`Object ${resource} already exist.`);
  }
}

export class AuthTimeoutError extends KFCoreError {
  status = 401;
  name = 'AuthTimeoutError';
  constructor() {
    super('认证失效，请重新登录');
  }
}


export class NotDefinedErrorError extends KFCoreError {
  name = 'NotDefinedErrorError';
  constructor() {
    super('未定义的错误')
  }
}

// TODO: use ResourceNotFoundError
export class UserNotExistError extends KFCoreError {
  name = 'UserNotExistError';
  constructor() {
    super('用户不存在')
  }
}

export class FieldIncorrentError extends KFCoreError {
  status = 400
  name = 'FieldIncorrentError';
  constructor(field) {
    super(`${field}字段不正确`)
  }
}

export class MissingParamError extends KFCoreError {
  name = 'MissingParamError';
  constructor(param?) {
    super(`缺少参数${param}`)
  }
}

export class NoPermissionError extends KFCoreError {
  name = 'NoPermissionError';
  constructor(operation?) {
    super(`没有权限${operation}`)
  }
}

export class FieldUsedError extends KFCoreError {
  name = 'FieldUsedError';
  constructor(field?) {
    super(`${field}已被使用`)
  }
}