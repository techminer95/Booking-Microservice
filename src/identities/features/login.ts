import {IHandler, IRequest, mediatrJs} from "../../mediatr.js";
import {dataSource} from "../../data/dataSource";
import {User} from "../entities/user";
import {isPasswordMatch} from "../../utils/encryption";
import {Body, Controller, Post, Route, SuccessResponse} from 'tsoa';
import Joi from "joi";
import UnauthorizedError from "../../types/unauthorizedError";
import {GenerateToken} from "./generateToken";
import {AuthDto} from "../dtos/authDto";
import {password} from "../../utils/validation";

export class Login implements IRequest<AuthDto> {
  email: string;
  password: string;

  constructor(request: Partial<Login> = {}) {
    Object.assign(this, request);
  }
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

const loginValidations =
  Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required().custom(password)
  });

@Route('/identity')
export class LoginController extends Controller {
  @Post('v1/login')
  @SuccessResponse('200', 'OK')
  public async login(@Body() request: LoginRequestDto): Promise<AuthDto> {

    const result = await mediatrJs.send<AuthDto>(new Login(request));

    return result;
  }
}

export class LoginHandler implements IHandler<Login, AuthDto> {
  async handle(request: Login): Promise<AuthDto> {
    await loginValidations.validateAsync(request);

    const userRepository = dataSource.getRepository(User);

    const user = await userRepository.findOneBy({
      email: request.email
    });

    if (!user || !(await isPasswordMatch(request.password, user.password as string))) {
      throw new UnauthorizedError('Incorrect email or password');
    }

    const token = await mediatrJs.send<AuthDto>(new GenerateToken({userId: user.id}));

    return token;
  }
}

const loginHandler = new LoginHandler();
mediatrJs.registerHandler(Login, loginHandler);