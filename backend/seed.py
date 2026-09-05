# ============================================================
# MineSafe AI — Database Seed Script
# ============================================================
# Checks if the prototype mine 'PROTO-01' exists.
# If missing, seeds the database with initial baseline data:
#   - Admin user (username: admin, password hashed)
#   - Prototype Mine ('PROTO-01')
#   - 3 Sensor Nodes (N01, N02, N03)
#   - Baseline sensor readings for nodes
#   - Safe Zones (R-01, R-02)
#   - Evacuation Routes (EVR-01, EVR-02)

from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, create_all_tables
from app.core.security import hash_password
from app.models.user import User
from app.models.mine import Mine
from app.models.node import Node
from app.models.sensor_reading import SensorReading
from app.models.safe_zone import SafeZone
from app.models.evacuation_route import EvacuationRoute


def seed_database():
    # Ensure tables are created
    create_all_tables()

    db: Session = SessionLocal()
    try:
        # Check if 'PROTO-01' already exists
        existing_mine = db.query(Mine).filter(Mine.id == "PROTO-01").first()
        if existing_mine:
            print("Database already seeded ('PROTO-01' exists). Skipping seed.")
            return

        print("Seeding database with prototype data...")

        # 1. Sample Users / Role-Based Credentials
        sample_users = [
            {
                "username": "admin",
                "password": "minesafe2026",
                "name": "Shri Rajesh Sharma",
                "role": "Safety Officer",
            },
            {
                "username": "geotech",
                "password": "minesafe2026",
                "name": "Dr. Ananya Verma",
                "role": "Geotechnical Engineer",
            },
            {
                "username": "manager",
                "password": "minesafe2026",
                "name": "Er. Vikram Patel",
                "role": "Mine Manager",
            },
            {
                "username": "inspector",
                "password": "minesafe2026",
                "name": "Shri Amit Sinha",
                "role": "DGMS Inspector",
            },
            {
                "username": "gis_analyst",
                "password": "minesafe2026",
                "name": "Pooja Iyer",
                "role": "GIS Analyst",
            },
        ]

        for u in sample_users:
            user_rec = db.query(User).filter(User.username == u["username"]).first()
            if not user_rec:
                user_rec = User(
                    username=u["username"],
                    password_hash=hash_password(u["password"]),
                    name=u["name"],
                    role=u["role"],
                    is_active=True,
                )
                db.add(user_rec)
                print(f"  Created user: {u['username']} ({u['role']})")

        # 2. Mine 'PROTO-01'
        mine = Mine(
            id="PROTO-01",
            name="Prototype Mine",
            location="Demonstration Site, Jharkhand, India",
            latitude=23.7945,
            longitude=86.4305,
            boundary=[
                [23.7970, 86.4270],
                [23.7970, 86.4345],
                [23.7920, 86.4345],
                [23.7920, 86.4270],
            ],
        )
        db.add(mine)
        print("  Created Mine 'PROTO-01'.")

        # 3. Nodes N01, N02, N03
        now = datetime.now(timezone.utc)

        node_n01 = Node(
            id="N01",
            mine_id="PROTO-01",
            name="Node N01",
            latitude=23.7958,
            longitude=86.4304,
            thr_tilt=0.40,
            thr_displacement=8.0,
            thr_vibration=55.0,
            thr_crack=True,
            thr_relative_movement=6.0,
            battery=84.0,
            wifi_signal=-52.0,
            packet_reception=99.2,
            status="Online",
            last_heartbeat=now,
        )

        node_n02 = Node(
            id="N02",
            mine_id="PROTO-01",
            name="Node N02",
            latitude=23.7945,
            longitude=86.4325,
            thr_tilt=0.45,
            thr_displacement=10.0,
            thr_vibration=50.0,
            thr_crack=True,
            thr_relative_movement=7.0,
            battery=77.0,
            wifi_signal=-61.0,
            packet_reception=98.8,
            status="Online",
            last_heartbeat=now,
        )

        node_n03 = Node(
            id="N03",
            mine_id="PROTO-01",
            name="Node N03",
            latitude=23.7935,
            longitude=86.4290,
            thr_tilt=0.50,
            thr_displacement=10.0,
            thr_vibration=52.0,
            thr_crack=True,
            thr_relative_movement=8.0,
            battery=72.0,
            wifi_signal=-68.0,
            packet_reception=97.9,
            status="Online",
            last_heartbeat=now,
        )

        db.add_all([node_n01, node_n02, node_n03])
        print("  Created Nodes: N01, N02, N03.")

        # 4. Initial Baseline Sensor Readings
        reading_n01 = SensorReading(
            node_id="N01",
            timestamp=now,
            tilt=0.12,
            displacement=2.3,
            vibration=18.0,
            crack_detected=False,
            relative_movement=1.8,
            risk_level="L0",
            risk_score=8,
            ai_confidence=95,
            predicted_deformation=0.5,
            prediction_horizon=6,
            trend="Stable",
        )

        reading_n02 = SensorReading(
            node_id="N02",
            timestamp=now,
            tilt=0.21,
            displacement=4.1,
            vibration=28.0,
            crack_detected=False,
            relative_movement=2.9,
            risk_level="L0",
            risk_score=15,
            ai_confidence=93,
            predicted_deformation=1.2,
            prediction_horizon=6,
            trend="Stable",
        )

        reading_n03 = SensorReading(
            node_id="N03",
            timestamp=now,
            tilt=0.18,
            displacement=3.5,
            vibration=22.0,
            crack_detected=False,
            relative_movement=2.1,
            risk_level="L0",
            risk_score=12,
            ai_confidence=94,
            predicted_deformation=0.8,
            prediction_horizon=6,
            trend="Stable",
        )

        db.add_all([reading_n01, reading_n02, reading_n03])
        print("  Created initial sensor readings for N01, N02, N03.")

        # 5. Safe Zones
        sz1 = SafeZone(
            id="R-01",
            mine_id="PROTO-01",
            name="Safe Zone R-01",
            type="refuge",
            latitude=23.7965,
            longitude=86.4335,
            capacity=30,
        )

        sz2 = SafeZone(
            id="R-02",
            mine_id="PROTO-01",
            name="Safe Zone R-02",
            type="assembly",
            latitude=23.7925,
            longitude=86.4315,
            capacity=50,
        )

        db.add_all([sz1, sz2])
        print("  Created Safe Zones: R-01, R-02.")

        # 6. Evacuation Routes
        evr1 = EvacuationRoute(
            id="EVR-01",
            mine_id="PROTO-01",
            name="Route to R-01",
            from_node_id="N03",
            to_safe_zone_id="R-01",
            distance=420.0,
            points=[
                [23.7935, 86.4290],
                [23.7940, 86.4300],
                [23.7948, 86.4312],
                [23.7955, 86.4325],
                [23.7965, 86.4335],
            ],
        )

        evr2 = EvacuationRoute(
            id="EVR-02",
            mine_id="PROTO-01",
            name="Route to R-02",
            from_node_id="N03",
            to_safe_zone_id="R-02",
            distance=340.0,
            points=[
                [23.7935, 86.4290],
                [23.7932, 86.4298],
                [23.7928, 86.4308],
                [23.7925, 86.4315],
            ],
        )

        db.add_all([evr1, evr2])
        print("  Created Evacuation Routes: EVR-01, EVR-02.")

        db.commit()
        print("Database seed completed successfully.")

    except Exception as e:
        db.rollback()
        print(f"Error during database seed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
