from flask import Blueprint, request, jsonify, session
from bson.objectid import ObjectId
from datetime import datetime
from marshmallow import ValidationError
from backend.models import db, service_record_schema, accident_history_schema

history_bp = Blueprint('history_bp', __name__)

@history_bp.route('/vehicles/<string:vehicle_id>/services', methods=['POST'])
def add_service_record(vehicle_id):
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    # 2. Verify Vehicle Ownership
    try:
        vehicle = db.vehicles.find_one({
            "_id": ObjectId(vehicle_id),
            "user_id": ObjectId(user_id)
        })
        if not vehicle:
            return jsonify({"error": "Vehicle not found or access denied"}), 404
    except Exception:
        return jsonify({"error": "Invalid vehicle ID"}), 400

    # 3. Validate Input Data 
    json_data = request.get_json()
    try:
        data = service_record_schema.load(json_data)
    except ValidationError as err:
        return jsonify(err.messages), 400

    # 4. Business Logic Validations
    # Check if service date is in the future
    if data['service_date'] > datetime.utcnow():
        return jsonify({"error": "Service date cannot be in the future"}), 400

    # 5. Prepare Document
    service_doc = {
        "vehicle_id": ObjectId(vehicle_id),
        "service_type": data['service_type'],
        "service_date": data['service_date'],
        "mileage_at_service": data['mileage_at_service'],
        "cost": data.get('cost'),
        "service_provider": data.get('service_provider'),
        "service_location": data.get('service_location'),
        "notes": data.get('notes'),
        "created_at": datetime.utcnow(),
        "created_by": ObjectId(user_id)
    }

    # 6. Insert into Database 
    try:
        result = db.servicerecords.insert_one(service_doc)
        
        # TODO: Trigger Prediction Engine 
        # prediction_engine.recalculate(vehicle_id)

        # Fetch the created record to return it
        new_record = db.servicerecords.find_one({"_id": result.inserted_id})
        return jsonify(service_record_schema.dump(new_record)), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@history_bp.route('/vehicles/<string:vehicle_id>/accidents', methods=['POST'])
def add_accident_record(vehicle_id):
    # 1. Authentication Check
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    # 2. Verify Vehicle Ownership
    try:
        vehicle = db.vehicles.find_one({
            "_id": ObjectId(vehicle_id),
            "user_id": ObjectId(user_id)
        })
        if not vehicle:
            return jsonify({"error": "Vehicle not found or access denied"}), 404
    except Exception:
        return jsonify({"error": "Invalid vehicle ID"}), 400

    # 3. Validate Input Data
    json_data = request.get_json()
    try:
        data = accident_history_schema.load(json_data)
    except ValidationError as err:
        return jsonify(err.messages), 400

    # 4. Prepare Document
    accident_doc = {
        "vehicle_id": ObjectId(vehicle_id),
        "accident_date": data['accident_date'],
        "accident_location": data.get('accident_location'),
        "description": data['description'],
        "estimated_cost": data.get('estimated_cost'),
        "insurance_claim": data.get('insurance_claim'),
        "police_report_number": data.get('police_report_number'),
        "severity": data.get('severity'),
        "created_at": datetime.utcnow(),
        "created_by": ObjectId(user_id)
    }

    # 5. Insert into Database
    try:
        result = db.accidenthistory.insert_one(accident_doc)
        
        # Fetch the created record to return it
        new_record = db.accidenthistory.find_one({"_id": result.inserted_id})
        return jsonify(accident_history_schema.dump(new_record)), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500
