from studyai.common.jobs import get_job_manager


def test_in_memory_job_manager_tracks_status_transitions():
    manager = get_job_manager()
    record = manager.create_job("embedding_index", {"count": 3})

    manager.start_job(record.job_id)
    completed = manager.complete_job(record.job_id, {"indexed": 3})

    assert completed.status == "completed"
    assert completed.result == {"indexed": 3}
    assert manager.get_job(record.job_id).status == "completed"
