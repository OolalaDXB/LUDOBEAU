-- RPCs callable by anon and authenticated; trigger functions kept off the API.
revoke all on function public.quiz_week_stats(text) from public;
revoke all on function public.quiz_leaderboard(int) from public;
revoke all on function public.wager_wall(int) from public;
grant execute on function public.quiz_week_stats(text) to anon, authenticated;
grant execute on function public.quiz_leaderboard(int) to anon, authenticated;
grant execute on function public.wager_wall(int) to anon, authenticated;

revoke all on function public.wagers_freeze_seal() from public, anon, authenticated;
revoke all on function public.wager_reveals_verify() from public, anon, authenticated;
revoke all on function public.wager_reveals_mark() from public, anon, authenticated;
revoke all on function public.wager_challenges_verify() from public, anon, authenticated;
