-- Metering metadata only. The worker gains no confidential program access.
grant update(spent_microusd,used_tokens) on public.ai_budget_accounts to launchstudio_worker;
