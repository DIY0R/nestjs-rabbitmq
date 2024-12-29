import { IsInt, IsString, MaxLength } from 'class-validator';

export class MyClass {
  @IsString()
  @MaxLength(5, { message: 'The name must be less than 5' })
  name: string;

  @IsInt()
  age: number;
}
