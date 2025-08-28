use anchor_lang::prelude::*;

declare_id!("6vQYZxfQLriD2J3P3AJpgVPMvUZ4w6c2c5AK7Sy6sjoU");

#[program]
pub mod main {
    // Re-export all universal_nft functionality
    pub use crate::universal_nft_core::*;
}

// Universal NFT modules
pub mod universal_nft_core;
