CREATE TABLE users (
	id SERIAL PRIMARY KEY,
	username VARCHAR(100) NOT NULL,
	yearOfBirth INTEGER NOT NULL,
	gender VARCHAR(10) NOT NULL,
	email VARCHAR(100) UNIQUE NOT NULL,
	password VARCHAR(100) NOT NULL
);


CREATE TABLE doctor (
    doctor_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    specialty VARCHAR(50),
    bio TEXT,
    office_address TEXT,
    contact_number VARCHAR(15),
    CONSTRAINT valid_specialty CHECK (length(specialty) > 0),
    CONSTRAINT valid_bio CHECK (length(bio) > 0),
    CONSTRAINT valid_address CHECK (length(office_address) > 0),
    CONSTRAINT valid_contact_number CHECK (length(contact_number) > 0)
);

CREATE TABLE appointment (
    appointment_id SERIAL PRIMARY KEY,
    doctor_id INT REFERENCES doctor(doctor_id),
    patient_id INT REFERENCES users(id),
    date DATE,
    time TIME,
    problem_description TEXT,
    status VARCHAR(20) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


