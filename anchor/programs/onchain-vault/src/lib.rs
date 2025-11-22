use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Transfer, transfer, Token, TokenAccount};


declare_id!("45xesS1KCdLubPrz6Z92WRTS1ZiwaH6qQhRsAftoMpC6");

#[program]
pub mod onchain_vault {

    use super::*;

    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.mint = ctx.accounts.mint.key();
        vault.escrow = ctx.accounts.escrow.key();
        vault.bump = ctx.bumps.vault;

        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {

        let cpi_acnts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.escrow.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_acnts);
        transfer(cpi_ctx, amount)?;

        let user_deposit = &mut ctx.accounts.user_deposit;

            if user_deposit.amount == 0 {
                user_deposit.amount = amount;
            } else {
                user_deposit.amount += amount;
            }

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let user_deposit = &mut ctx.accounts.user_deposit;

        require!(user_deposit.amount >= amount, CustomError::InsufficientFunds);

        let vault = &ctx.accounts.vault;
        let authority_seeds = &[
            b"vault",
            vault.authority.as_ref(),
            vault.mint.as_ref(),
            &[vault.bump],
        ];
        let signer_seeds = &[&authority_seeds[..]];

        let cpi_acnts = Transfer {
            from: ctx.accounts.escrow.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_acnts, signer_seeds);
        transfer(cpi_ctx, amount)?;

        user_deposit.amount -= amount;


    Ok(())
    }

    
}



#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"vault", user.key().as_ref(), mint.key().as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [b"user_deposit", user.key().as_ref(), vault.key().as_ref()],
        bump,
    )]
    pub user_deposit: Account<'info, UserDeposit>,

    #[account(mut,
         constraint = escrow.key() == vault.escrow
    )]
    pub escrow: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = user_token_account.owner == user.key() 
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,

} 


#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"vault", user.key().as_ref(), mint.key().as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        init,
        payer = user,
        space = 8 + UserDeposit::INIT_SPACE,
        seeds = [b"user_deposit", user.key().as_ref(), vault.key().as_ref()],
        bump,
    )]
    pub user_deposit: Account<'info, UserDeposit>,

    #[account(mut,
         constraint = escrow.key() == vault.escrow
    )]
    pub escrow: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = user_token_account.owner == user.key() 
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,

}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + Vault::INIT_SPACE,
        seeds = [b"vault", authority.key().as_ref(), mint.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, Vault>,

    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub escrow: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
#[derive(InitSpace)]
pub struct UserDeposit {
    pub amount: u64,
}

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub escrow: Pubkey,
    pub bump: u8,
}

#[error_code]
pub enum CustomError {
    #[msg("Insufficient funds for withdrawal")]
    InsufficientFunds,
}