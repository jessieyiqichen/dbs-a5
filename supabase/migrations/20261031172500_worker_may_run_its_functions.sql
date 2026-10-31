-- The first worker call failed: "permission denied for function claim_next_board". The tables migration revoked
-- execute from public, and the worker's role (service_role) had it only through public. Give it back to the worker
-- alone; signed-in people and visitors still cannot run either function.
grant execute on function public.claim_next_board(), public.refresh_rise(text) to service_role;
