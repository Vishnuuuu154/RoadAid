package com.roadaid.backend.exception;

public class MechanicAlreadyExistsException extends RuntimeException {

    public MechanicAlreadyExistsException(String message) {
        super(message);
    }
}