package com.roadaid.backend.exception;

public class MechanicNotFoundException extends RuntimeException {

    public MechanicNotFoundException(String message) {
        super(message);
    }
}