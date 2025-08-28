use anchor_lang::prelude::*;
use anchor_spl::{
    token::{self, Token, TokenAccount, Mint, Burn, MintTo},
    metadata::{
        create_metadata_accounts_v3, CreateMetadataAccountsV3, Metadata,
        create_master_edition_v3, CreateMasterEditionV3,
    },
    associated_token::AssociatedToken,
};

// Import types from mpl-token-metadata crate
use mpl_token_metadata::types::DataV2;

/// Initialize the Universal NFT program with all features
pub fn initialize(
    ctx: Context<Initialize>,
    name: String,
    symbol: String,
    gateway_address: Pubkey,
    gas_limit: u64,
    uniswap_router: Pubkey,
) -> Result<()> {
    let state = &mut ctx.accounts.state;
    state.authority = ctx.accounts.initial_owner.key();
    state.name = name.clone();
    state.symbol = symbol.clone();
    state.gateway = gateway_address;
    state.gas_limit = gas_limit;
    state.uniswap_router = uniswap_router;
    state.is_paused = false;
    state.next_token_id = 1;
    state.total_supply = 0;
    state.is_initialized = true;
    
    emit!(ProgramInitialized {
        authority: state.authority,
        name,
        symbol,
        gateway: gateway_address,
    });
    
    Ok(())
}

/// Set the gateway address (only owner)
pub fn set_gateway(ctx: Context<AdminOperation>, gateway_address: Pubkey) -> Result<()> {
    let state = &mut ctx.accounts.state;
    require!(!state.is_paused, ErrorCode::ContractPaused);
    
    state.gateway = gateway_address;
    
    emit!(GatewayUpdated {
        new_gateway: gateway_address,
    });
    
    Ok(())
}

/// Set gas limit (only owner)
pub fn set_gas_limit(ctx: Context<AdminOperation>, gas_limit: u64) -> Result<()> {
    let state = &mut ctx.accounts.state;
    require!(!state.is_paused, ErrorCode::ContractPaused);
    require!(gas_limit > 0, ErrorCode::InvalidGasLimit);
    
    state.gas_limit = gas_limit;
    
    emit!(GasLimitUpdated {
        new_gas_limit: gas_limit,
    });
    
    Ok(())
}

/// Connect a chain (mapping equivalent)
pub fn set_connected(
    ctx: Context<SetConnected>,
    chain_id: u64,
    contract_address: String,
) -> Result<()> {
    let state = &ctx.accounts.state;
    require!(!state.is_paused, ErrorCode::ContractPaused);
    require!(!contract_address.is_empty(), ErrorCode::InvalidAddress);
    
    let connection = &mut ctx.accounts.connection;
    connection.chain_id = chain_id;
    connection.contract_address = contract_address.clone();
    connection.is_active = true;
    
    emit!(ChainConnected {
        chain_id,
        contract_address,
    });
    
    Ok(())
}

/// Pause the contract (only owner)
pub fn pause(ctx: Context<AdminOperation>) -> Result<()> {
    let state = &mut ctx.accounts.state;
    require!(!state.is_paused, ErrorCode::AlreadyPaused);
    
    state.is_paused = true;
    
    emit!(ContractPaused {
        by: ctx.accounts.authority.key(),
    });
    
    Ok(())
}

/// Unpause the contract (only owner)
pub fn unpause(ctx: Context<AdminOperation>) -> Result<()> {
    let state = &mut ctx.accounts.state;
    require!(state.is_paused, ErrorCode::NotPaused);
    
    state.is_paused = false;
    
    emit!(ContractUnpaused {
        by: ctx.accounts.authority.key(),
    });
    
    Ok(())
}

/// Safe mint an NFT with auto-generated token ID
pub fn safe_mint(
    ctx: Context<SafeMint>,
    uri: String,
) -> Result<()> {
    let state = &mut ctx.accounts.state;
    require!(!state.is_paused, ErrorCode::ContractPaused);

    // Get current block number (slot) and clock
    let clock = Clock::get()?;
    let block_number = clock.slot;
    
    // Generate token ID from [mint pubkey + block.number + _nextTokenId++]
    let mint_key = ctx.accounts.mint.key();
    
    // Create a more direct token ID combining mint pubkey, block number, and next token ID
    // We'll use the first 8 bytes of the mint pubkey, block number, and next token ID
    let mint_bytes = mint_key.to_bytes();
    let mint_u64 = u64::from_le_bytes([
        mint_bytes[0], mint_bytes[1], mint_bytes[2], mint_bytes[3],
        mint_bytes[4], mint_bytes[5], mint_bytes[6], mint_bytes[7]
    ]);
    
    // Combine the values: (mint_u64 >> 16) + (block_number << 32) + next_token_id
    let token_id = ((mint_u64 >> 16) & 0x000000FFFFFFFFFF) + 
                   ((block_number as u64) << 32) + 
                   state.next_token_id;

    // Increment counters
    state.next_token_id += 1;
    state.total_supply += 1;

    // Update NFT data
    let nft_data = &mut ctx.accounts.nft_data;
    nft_data.token_id = token_id;
    nft_data.uri = uri.clone();
    nft_data.owner = ctx.accounts.recipient.key();
    nft_data.is_burned = false;
    nft_data.mint_timestamp = clock.unix_timestamp;

    // Update enumerable data
    let enumerable = &mut ctx.accounts.enumerable_data;
    enumerable.token_id = token_id;
    enumerable.owner = ctx.accounts.recipient.key();
    enumerable.index_in_owner_list = 0; // This would need proper indexing logic

    // Create the NFT token account (mint 1 token)
    let cpi_accounts = MintTo {
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.token_account.to_account_info(),
        authority: ctx.accounts.mint_authority.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::mint_to(cpi_ctx, 1)?;

    // Create metadata using the mint account as seed
    let metadata_accounts = CreateMetadataAccountsV3 {
        metadata: ctx.accounts.metadata.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        mint_authority: ctx.accounts.mint_authority.to_account_info(),
        update_authority: ctx.accounts.mint_authority.to_account_info(),
        payer: ctx.accounts.payer.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
    };

    let metadata_ctx = CpiContext::new(
        ctx.accounts.token_metadata_program.to_account_info(),
        metadata_accounts,
    );

    let data = DataV2 {
        name: format!("{} #{}", state.name, token_id),
        symbol: state.symbol.clone(),
        uri: uri.clone(),
        seller_fee_basis_points: 0,
        creators: None,
        collection: None,
        uses: None,
    };

    create_metadata_accounts_v3(metadata_ctx, data, false, true, None)?;

    // Create master edition using the mint account as seed
    let master_edition_accounts = CreateMasterEditionV3 {
        edition: ctx.accounts.master_edition.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        update_authority: ctx.accounts.mint_authority.to_account_info(),
        mint_authority: ctx.accounts.mint_authority.to_account_info(),
        payer: ctx.accounts.payer.to_account_info(),
        metadata: ctx.accounts.metadata.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
    };

    let master_edition_ctx = CpiContext::new(
        ctx.accounts.token_metadata_program.to_account_info(),
        master_edition_accounts,
    );

    create_master_edition_v3(master_edition_ctx, Some(0))?; // 0 means unlimited supply

    // Create NFT origin PDA with token ID and constant seed
    let nft_origin = &mut ctx.accounts.nft_origin;
    nft_origin.original_mint = mint_key;
    nft_origin.token_id = token_id;
    nft_origin.block_number = block_number;
    nft_origin.mint_timestamp = clock.unix_timestamp;

    emit!(TokenMinted {
        recipient: ctx.accounts.recipient.key(),
        token_id,
        uri,
    });

    Ok(())
}

/// Burn an NFT (owner or approved)
pub fn burn_token(ctx: Context<BurnToken>, token_id: u64) -> Result<()> {
    let state = &mut ctx.accounts.state;
    require!(!state.is_paused, ErrorCode::ContractPaused);

    let nft_data = &mut ctx.accounts.nft_data;
    require!(!nft_data.is_burned, ErrorCode::TokenNotExists);
    require!(nft_data.owner == ctx.accounts.authority.key(), ErrorCode::Unauthorized);

    // Mark as burned
    nft_data.is_burned = true;
    state.total_supply -= 1;

    // Burn the token
    let cpi_accounts = Burn {
        mint: ctx.accounts.mint.to_account_info(),
        from: ctx.accounts.token_account.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::burn(cpi_ctx, 1)?;

    emit!(TokenBurned {
        owner: ctx.accounts.authority.key(),
        token_id,
    });

    Ok(())
}

/// Transfer NFT cross-chain
pub fn transfer_cross_chain(
    ctx: Context<TransferCrossChain>,
    token_id: u64,
    receiver: String, // Address on destination chain
    destination_chain_id: u64,
) -> Result<()> {
    let state = &mut ctx.accounts.state;
    require!(!state.is_paused, ErrorCode::ContractPaused);

    let nft_data = &mut ctx.accounts.nft_data;
    require!(!nft_data.is_burned, ErrorCode::TokenNotExists);
    require!(nft_data.owner == ctx.accounts.owner.key(), ErrorCode::Unauthorized);
    require!(!receiver.is_empty(), ErrorCode::InvalidAddress);

    // Fetch the token ID from the nft_origin PDA
    // This ensures we always use the correct token ID from the origin information
    let nft_origin_data = NFTOrigin::try_deserialize(&mut &ctx.accounts.nft_origin.data.borrow()[..])?;
    let origin_token_id = nft_origin_data.token_id;
    
    // Verify that the token ID from the PDA matches the input token_id
    require!(origin_token_id == token_id, ErrorCode::InvalidState);
    
    // Mark as burned (equivalent to burning in Solidity)
    nft_data.is_burned = true;
    nft_data.pending_transfer = Some(PendingTransfer {
        destination_chain: destination_chain_id,
        receiver: receiver.clone(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    state.total_supply -= 1;

    // Burn the NFT on Solana
    let cpi_accounts = Burn {
        mint: ctx.accounts.mint.to_account_info(),
        from: ctx.accounts.token_account.to_account_info(),
        authority: ctx.accounts.owner.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::burn(cpi_ctx, 1)?;

    // Emit event with the token ID fetched from nft_origin PDA
    emit!(TokenTransfer {
        receiver: receiver.clone(),
        destination: destination_chain_id,
        token_id: origin_token_id, // Use token ID from nft_origin PDA
        uri: nft_data.uri.clone(),
    });

    // Here you would integrate with cross-chain infrastructure
    // The token ID from nft_origin PDA will be used in the cross-chain message
    // This ensures the same token ID is minted on the connected chain
    msg!("Cross-chain transfer initiated for token {} (from nft_origin PDA) to chain {} for receiver {}", 
         origin_token_id, destination_chain_id, receiver);

    Ok(())
}

/// Handle incoming cross-chain transfer
pub fn handle_cross_chain_receive(
    ctx: Context<HandleCrossChainReceive>,
    token_id: u64,
    uri: String,
    sender_chain_id: u64,
    _original_sender: String,
) -> Result<()> {
    let state = &mut ctx.accounts.state;
    require!(!state.is_paused, ErrorCode::ContractPaused);
    
    state.total_supply += 1;
    
    let nft_data = &mut ctx.accounts.nft_data;
    nft_data.token_id = token_id;
    nft_data.uri = uri.clone();
    nft_data.owner = ctx.accounts.recipient.key();
    nft_data.is_burned = false;
    nft_data.original_chain = Some(sender_chain_id);
    nft_data.mint_timestamp = Clock::get()?.unix_timestamp;

    // Create enumerable entry
    let enumerable = &mut ctx.accounts.enumerable_data;
    enumerable.token_id = token_id;
    enumerable.owner = ctx.accounts.recipient.key();
    enumerable.index_in_owner_list = 0;

    // Mint new NFT
    let cpi_accounts = MintTo {
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.token_account.to_account_info(),
        authority: ctx.accounts.mint_authority.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::mint_to(cpi_ctx, 1)?;

    emit!(TokenTransferReceived {
        recipient: ctx.accounts.recipient.key(),
        token_id,
        uri,
    });

    Ok(())
}

/// Revert a failed cross-chain transfer
pub fn revert_transfer(
    ctx: Context<RevertTransfer>,
    token_id: u64,
    original_owner: Pubkey,
) -> Result<()> {
    let state = &mut ctx.accounts.state;
    let nft_data = &mut ctx.accounts.nft_data;
    require!(nft_data.is_burned, ErrorCode::InvalidState);
    
    // Restore the NFT to original owner
    nft_data.is_burned = false;
    nft_data.owner = original_owner;
    nft_data.pending_transfer = None;
    state.total_supply += 1;

    // Re-mint the token
    let cpi_accounts = MintTo {
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.token_account.to_account_info(),
        authority: ctx.accounts.mint_authority.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::mint_to(cpi_ctx, 1)?;

    emit!(TokenTransferReverted {
        owner: original_owner,
        token_id,
        uri: nft_data.uri.clone(),
    });

    Ok(())
}

/// Get token by owner and index (for enumeration)
pub fn token_of_owner_by_index(
    ctx: Context<TokenQuery>,
    _owner: Pubkey,
    _index: u64,
) -> Result<u64> {
    // This would require a more complex indexing system in practice
    // For now, return the token_id from the enumerable data
    Ok(ctx.accounts.enumerable_data.token_id)
}

/// Get total supply
pub fn total_supply(ctx: Context<TokenQuery>) -> Result<u64> {
    Ok(ctx.accounts.state.total_supply)
}

/// Check if contract is paused
pub fn is_paused(ctx: Context<TokenQuery>) -> Result<bool> {
    Ok(ctx.accounts.state.is_paused)
}

// Account structs
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = initial_owner, space = 8 + ProgramState::INIT_SPACE)]
    pub state: Account<'info, ProgramState>,
    #[account(mut)]
    pub initial_owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminOperation<'info> {
    #[account(mut, has_one = authority)]
    pub state: Account<'info, ProgramState>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(chain_id: u64)]
pub struct SetConnected<'info> {
    #[account(has_one = authority)]
    pub state: Account<'info, ProgramState>,
    #[account(
        init,
        payer = authority,
        space = 8 + ChainConnection::INIT_SPACE,
        seeds = [b"connection", chain_id.to_le_bytes().as_ref()],
        bump
    )]
    pub connection: Account<'info, ChainConnection>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(uri: String)]
pub struct SafeMint<'info> {
    #[account(mut, has_one = authority)]
    pub state: Account<'info, ProgramState>,
    #[account(
        init,
        payer = payer,
        space = 8 + NftData::INIT_SPACE,
        seeds = [b"nft", state.next_token_id.to_le_bytes().as_ref()],
        bump
    )]
    pub nft_data: Account<'info, NftData>,
    #[account(
        init,
        payer = payer,
        space = 8 + EnumerableData::INIT_SPACE,
        seeds = [b"enumerable", state.next_token_id.to_le_bytes().as_ref()],
        bump
    )]
    pub enumerable_data: Account<'info, EnumerableData>,
    #[account(init, payer = payer, mint::decimals = 0, mint::authority = mint_authority)]
    pub mint: Account<'info, Mint>,
    #[account(init, payer = payer, associated_token::mint = mint, associated_token::authority = recipient)]
    pub token_account: Account<'info, TokenAccount>,
    /// CHECK: Metadata account
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    /// CHECK: Master Edition account
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + NFTOrigin::INIT_SPACE,
        seeds = [b"nft_origin", mint.key().as_ref(), state.next_token_id.to_le_bytes().as_ref()],
        bump
    )]
    pub nft_origin: Account<'info, NFTOrigin>,
    pub recipient: SystemAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub authority: Signer<'info>,
    pub mint_authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(token_id: u64)]
pub struct BurnToken<'info> {
    #[account(mut)]
    pub state: Account<'info, ProgramState>,
    #[account(mut, seeds = [b"nft", token_id.to_le_bytes().as_ref()], bump)]
    pub nft_data: Account<'info, NftData>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut, associated_token::mint = mint, associated_token::authority = authority)]
    pub token_account: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(token_id: u64)]
pub struct TransferCrossChain<'info> {
    #[account(mut)]
    pub state: Account<'info, ProgramState>,
    #[account(mut, seeds = [b"nft", token_id.to_le_bytes().as_ref()], bump)]
    pub nft_data: Account<'info, NftData>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut, associated_token::mint = mint, associated_token::authority = owner)]
    pub token_account: Account<'info, TokenAccount>,
    /// CHECK: NFT Origin PDA to fetch token ID
    pub nft_origin: UncheckedAccount<'info>,
    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(token_id: u64)]
pub struct HandleCrossChainReceive<'info> {
    #[account(mut)]
    pub state: Account<'info, ProgramState>,
    #[account(
        init,
        payer = payer,
        space = 8 + NftData::INIT_SPACE,
        seeds = [b"nft", token_id.to_le_bytes().as_ref()],
        bump
    )]
    pub nft_data: Account<'info, NftData>,
    #[account(
        init,
        payer = payer,
        space = 8 + EnumerableData::INIT_SPACE,
        seeds = [b"enumerable", token_id.to_le_bytes().as_ref()],
        bump
    )]
    pub enumerable_data: Account<'info, EnumerableData>,
    #[account(init, payer = payer, mint::decimals = 0, mint::authority = mint_authority)]
    pub mint: Account<'info, Mint>,
    #[account(init, payer = payer, associated_token::mint = mint, associated_token::authority = recipient)]
    pub token_account: Account<'info, TokenAccount>,
    pub recipient: SystemAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub mint_authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(token_id: u64)]
pub struct RevertTransfer<'info> {
    #[account(mut)]
    pub state: Account<'info, ProgramState>,
    #[account(mut, seeds = [b"nft", token_id.to_le_bytes().as_ref()], bump)]
    pub nft_data: Account<'info, NftData>,
    #[account(init, payer = payer, mint::decimals = 0, mint::authority = mint_authority)]
    pub mint: Account<'info, Mint>,
    #[account(init, payer = payer, associated_token::mint = mint, associated_token::authority = original_owner)]
    pub token_account: Account<'info, TokenAccount>,
    pub original_owner: SystemAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub mint_authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TokenQuery<'info> {
    pub state: Account<'info, ProgramState>,
    pub enumerable_data: Account<'info, EnumerableData>,
}

// Data structs
#[account]
#[derive(InitSpace)]
pub struct ProgramState {
    pub authority: Pubkey,
    #[max_len(50)]
    pub name: String,
    #[max_len(10)]
    pub symbol: String,
    pub gateway: Pubkey,
    pub gas_limit: u64,
    pub uniswap_router: Pubkey,
    pub is_paused: bool,
    pub next_token_id: u64,
    pub total_supply: u64,
    pub is_initialized: bool,
}

#[account]
#[derive(InitSpace)]
pub struct ChainConnection {
    pub chain_id: u64,
    #[max_len(200)]
    pub contract_address: String,
    pub is_active: bool,
}

#[account]
#[derive(InitSpace)]
pub struct NftData {
    pub token_id: u64,
    #[max_len(500)]
    pub uri: String,
    pub owner: Pubkey,
    pub is_burned: bool,
    pub original_chain: Option<u64>,
    pub pending_transfer: Option<PendingTransfer>,
    pub mint_timestamp: i64,
}

#[account]
#[derive(InitSpace)]
pub struct EnumerableData {
    pub token_id: u64,
    pub owner: Pubkey,
    pub index_in_owner_list: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct PendingTransfer {
    pub destination_chain: u64,
    #[max_len(200)]
    pub receiver: String,
    pub timestamp: i64,
}

/// NFT Origin information stored in PDA
#[account]
#[derive(InitSpace)]
pub struct NFTOrigin {
    pub original_mint: Pubkey,
    pub token_id: u64,
    pub block_number: u64,
    pub mint_timestamp: i64,
}

// Events
#[event]
pub struct ProgramInitialized {
    pub authority: Pubkey,
    pub name: String,
    pub symbol: String,
    pub gateway: Pubkey,
}

#[event]
pub struct GatewayUpdated {
    pub new_gateway: Pubkey,
}

#[event]
pub struct GasLimitUpdated {
    pub new_gas_limit: u64,
}

#[event]
pub struct ChainConnected {
    pub chain_id: u64,
    pub contract_address: String,
}

#[event]
pub struct ContractPaused {
    pub by: Pubkey,
}

#[event]
pub struct ContractUnpaused {
    pub by: Pubkey,
}

#[event]
pub struct TokenMinted {
    pub recipient: Pubkey,
    pub token_id: u64,
    pub uri: String,
}

#[event]
pub struct TokenBurned {
    pub owner: Pubkey,
    pub token_id: u64,
}

#[event]
pub struct TokenTransfer {
    pub receiver: String,
    pub destination: u64,
    pub token_id: u64,
    pub uri: String,
}

#[event]
pub struct TokenTransferReceived {
    pub recipient: Pubkey,
    pub token_id: u64,
    pub uri: String,
}

#[event]
pub struct TokenTransferReverted {
    pub owner: Pubkey,
    pub token_id: u64,
    pub uri: String,
}

// Error codes
#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Invalid address")]
    InvalidAddress,
    #[msg("Invalid gas limit")]
    InvalidGasLimit,
    #[msg("Token does not exist or is burned")]
    TokenNotExists,
    #[msg("Invalid state for operation")]
    InvalidState,
    #[msg("Contract is paused")]
    ContractPaused,
    #[msg("Contract is already paused")]
    AlreadyPaused,
    #[msg("Contract is not paused")]
    NotPaused,
}

