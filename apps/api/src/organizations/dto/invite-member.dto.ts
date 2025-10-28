import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class InviteMemberDto {
	@IsEmail()
	email: string;

	@IsOptional()
	@IsIn(['OWNER', 'ADMIN', 'MEMBER'])
	role?: 'OWNER' | 'ADMIN' | 'MEMBER';

	@IsOptional()
	@IsString()
	name?: string;
}
