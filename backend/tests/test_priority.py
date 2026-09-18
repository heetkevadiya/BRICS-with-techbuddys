import pytest

from app.services.priority_service import DEFAULT_WEIGHTS, compute_priority


def test_blueprint_example():
    b = compute_priority(demand=90, infrastructure_gap=85, population_impact=80, urgency=88, policy_alignment=70, w=DEFAULT_WEIGHTS)
    assert b.priority == 84.5  # 27 + 21.25 + 16 + 13.2 + 7 = 84.45


def test_bounds():
    with pytest.raises(ValueError):
        compute_priority(demand=120, infrastructure_gap=0, population_impact=0, urgency=0, policy_alignment=0)


def test_reproducible():
    a = compute_priority(demand=50, infrastructure_gap=50, population_impact=50, urgency=50, policy_alignment=50)
    b = compute_priority(demand=50, infrastructure_gap=50, population_impact=50, urgency=50, policy_alignment=50)
    assert a == b and a.priority == 50.0
