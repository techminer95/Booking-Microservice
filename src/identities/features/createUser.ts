import {IHandler, IRequest, mediatrJs} from "../../mediatr.js";
import {Role} from "../enums/role";
import {dataSource} from "../../data/dataSource";
import {User} from "../entities/user";
import {encryptPassword} from "../../utils/encryption";
import {UserDto} from "../dtos/userDto";
import mapper from "../mapping";
import {Body, Controller, Post, Route, Security, SuccessResponse} from 'tsoa';
import httpStatus from 'http-status';
import Joi from "joi";
import ConflictError from "../../types/conflictError";
import {password} from "../../utils/validation";

export class CreateUser implements IRequest<UserDto> {
  email: string;
  password: string;
  name: string;
  role: Role;

  constructor(request: Partial<CreateUser> = {}) {
    Object.assign(this, request);
  }
}

export interface CreateUserRequestDto {
  email: string;
  password: string;
  name: string;
  role: Role;
}

const createUserValidations =
  Joi.object({
    email: Joi.string().required().email(),
    password: Joi.string().required().custom(password),
    name: Joi.string().required(),
    role: Joi.string().required().valid(Role.USER, Role.ADMIN)
  });

@Route('/identity')
export class CreateUserController extends Controller {
  @Post('v1/create')
  // @Security("jwt")
  @SuccessResponse('201', 'CREATED')
  public async createUser(@Body() request: CreateUserRequestDto): Promise<UserDto> {

    const result = await mediatrJs.send<UserDto>(new CreateUser({
      email: request.email,
      password: request.password,
      name: request.name,
      role: request.role
    }));

    this.setStatus(httpStatus.CREATED);
    return result;
  }
}

export class CreateUserHandler implements IHandler<CreateUser, UserDto> {
  async handle(request: CreateUser): Promise<UserDto> {
    await createUserValidations.validateAsync(request);

    const userRepository = dataSource.getRepository(User);

    const existUser = await userRepository.findOneBy({
      email: request.email
    });

    if(existUser){
        throw new ConflictError('Email already taken');
    }

    const user = {
      createdAt: new Date(),
      email: request.email,
      name: request.name,
      role: request.role,
      password: await encryptPassword(request.password),
      isEmailVerified: false
    };

    const userEntity = await userRepository.save(user);

    const result = mapper.map<User, UserDto>(userEntity, new UserDto());

    return result;
  }
}

const createUserHandler = new CreateUserHandler();
mediatrJs.registerHandler(CreateUser, createUserHandler);
