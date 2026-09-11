import pytest


@pytest.mark.asyncio
async def test_migration_failure_aborts_program_startup(monkeypatch):
    import module.core.program as program_module

    async def fail_upgrade():
        raise RuntimeError("migration failed")

    async def should_not_start():
        pytest.fail("workers must not start after migration failure")

    monkeypatch.setattr(program_module, "upgrade_database", fail_upgrade)
    monkeypatch.setattr(program_module.Program, "start", should_not_start)

    with pytest.raises(RuntimeError, match="migration failed"):
        await program_module.Program().startup()
