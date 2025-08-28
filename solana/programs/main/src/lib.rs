use anchor_lang::prelude::*;

declare_id!("C4KbLZG5ZZmK3QabqAHhev3YV4NMM5iDtufJgjRZQCTq");

#[program]
pub mod main {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        name: String,
        symbol: String,
        gateway_address: Pubkey,
        gas_limit: u64,
        uniswap_router: Pubkey,
    ) -> Result<()> {
        universal_nft_core::_initialize(ctx, name, symbol, gateway_address, gas_limit, uniswap_router)
    }

    pub fn set_gateway(ctx: Context<AdminOperation>, gateway_address: Pubkey) -> Result<()> {
        universal_nft_core::_set_gateway(ctx, gateway_address)
    }

    pub fn set_gas_limit(ctx: Context<AdminOperation>, gas_limit: u64) -> Result<()> {
        universal_nft_core::_set_gas_limit(ctx, gas_limit)
    }

    pub fn set_connected(
        ctx: Context<SetConnected>,
        chain_id: u64,
        contract_address: String,
    ) -> Result<()> {
        universal_nft_core::_set_connected(ctx, chain_id, contract_address)
    }

    pub fn pause(ctx: Context<AdminOperation>) -> Result<()> {
        universal_nft_core::_pause(ctx)
    }

    pub fn unpause(ctx: Context<AdminOperation>) -> Result<()> {
        universal_nft_core::_unpause(ctx)
    }

    pub fn safe_mint(ctx: Context<SafeMint>, uri: String) -> Result<()> {
        universal_nft_core::_safe_mint(ctx, uri)
    }

    pub fn burn_token(ctx: Context<BurnToken>, token_id: u64) -> Result<()> {
        universal_nft_core::_burn_token(ctx, token_id)
    }

    pub fn transfer_cross_chain(
        ctx: Context<TransferCrossChain>,
        token_id: u64,
        receiver: String,
        destination_chain_id: u64,
    ) -> Result<()> {
        universal_nft_core::_transfer_cross_chain(ctx, token_id, receiver, destination_chain_id)
    }

    pub fn handle_cross_chain_receive(
        ctx: Context<HandleCrossChainReceive>,
        token_id: u64,
        uri: String,
        sender_chain_id: u64,
        original_sender: String,
    ) -> Result<()> {
        universal_nft_core::_handle_cross_chain_receive(ctx, token_id, uri, sender_chain_id, original_sender)
    }

    pub fn revert_transfer(
        ctx: Context<RevertTransfer>,
        token_id: u64,
        original_owner: Pubkey,
    ) -> Result<()> {
        universal_nft_core::_revert_transfer(ctx, token_id, original_owner)
    }

    pub fn token_of_owner_by_index(
        ctx: Context<TokenQuery>,
        owner: Pubkey,
        index: u64,
    ) -> Result<u64> {
        universal_nft_core::_token_of_owner_by_index(ctx, owner, index)
    }

    pub fn total_supply(ctx: Context<TokenQuery>) -> Result<u64> {
        universal_nft_core::_total_supply(ctx)
    }

    pub fn is_paused(ctx: Context<TokenQuery>) -> Result<bool> {
        universal_nft_core::_is_paused(ctx)
    }
}

// Universal NFT modules
pub mod universal_nft_core;

// Re-export the account structs and other types that clients need
pub use universal_nft_core::*;