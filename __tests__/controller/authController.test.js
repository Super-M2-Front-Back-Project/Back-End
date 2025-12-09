/**
 * Unit tests for authController
 * Tests authentication logic with mocked Supabase
 */

const { registerUser, loginUser } = require('../../controller/authController');

// Mock Supabase
jest.mock('../../config/supabase', () => ({
    supabase: {
        from: jest.fn(),
        auth: {
            signUp: jest.fn(),
            signInWithPassword: jest.fn()
        }
    }
}));

const { supabase } = require('../../config/supabase');

describe('authController - registerUser', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should register user successfully', async () => {
        // Mock role lookup
        const mockFrom = jest.fn().mockReturnThis();
        const mockSelect = jest.fn().mockReturnThis();
        const mockEq = jest.fn().mockReturnThis();
        const mockSingle = jest.fn().mockResolvedValue({
            data: { id: 'role-123' },
            error: null
        });

        supabase.from.mockImplementation(() => ({
            from: mockFrom,
            select: mockSelect,
            eq: mockEq,
            single: mockSingle,
            insert: jest.fn().mockResolvedValue({ error: null })
        }));

        supabase.from.mockReturnValue({
            select: mockSelect,
            eq: mockEq,
            single: mockSingle,
            insert: jest.fn().mockResolvedValue({ error: null })
        });

        mockSelect.mockReturnValue({
            eq: mockEq,
            single: mockSingle
        });

        mockEq.mockReturnValue({
            single: mockSingle
        });

        // Mock auth signup
        supabase.auth.signUp.mockResolvedValue({
            data: {
                user: { id: 'user-123' }
            },
            error: null
        });

        // Mock user insert
        const mockInsert = jest.fn().mockResolvedValue({ error: null });
        supabase.from.mockReturnValueOnce({
            select: mockSelect,
            eq: mockEq,
            single: mockSingle
        }).mockReturnValueOnce({
            insert: mockInsert
        });

        await registerUser(
            'test@example.com',
            'password123',
            'Doe',
            'John',
            '1990-01-01',
            '123 Main St',
            '75001',
            'Paris',
            '0123456789'
        );

        expect(supabase.auth.signUp).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password123'
        });
    });

    test('should throw error if CLIENT role not found', async () => {
        supabase.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Role not found' }
            })
        });

        await expect(
            registerUser('test@example.com', 'password123', 'Doe', 'John', '1990-01-01', '123 Main St', '75001', 'Paris')
        ).rejects.toThrow('Rôle CLIENT non trouvé - base de données non initialisée');
    });

    test('should throw error if auth signup fails with error object', async () => {
        // Mock role lookup success
        supabase.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
                data: { id: 'role-123' },
                error: null
            })
        });

        // Mock auth signup failure with error
        const authError = new Error('Email already exists');
        supabase.auth.signUp.mockResolvedValue({
            data: null,
            error: authError
        });

        await expect(
            registerUser('test@example.com', 'password123', 'Doe', 'John', '1990-01-01', '123 Main St', '75001', 'Paris')
        ).rejects.toThrow('Email already exists');
    });
});

describe('authController - loginUser', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should login user successfully', async () => {
        // Mock auth signin
        supabase.auth.signInWithPassword.mockResolvedValue({
            data: {
                user: { id: 'user-123' },
                session: { access_token: 'token-abc' }
            },
            error: null
        });

        // Mock user lookup
        supabase.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
                data: {
                    id: 'user-123',
                    email: 'test@example.com',
                    last_name: 'Doe',
                    first_name: 'John',
                    address: '123 Main St, 75001, Paris',
                    role: { id: 'role-123', name: 'CLIENT' }
                },
                error: null
            })
        });

        const result = await loginUser('test@example.com', 'password123');

        expect(result).toEqual({
            token: 'token-abc',
            user: {
                id: 'user-123',
                email: 'test@example.com',
                last_name: 'Doe',
                first_name: 'John',
                address: '123 Main St, 75001, Paris',
                role: { id: 'role-123', name: 'CLIENT' }
            }
        });

        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password123'
        });
    });

    test('should throw error if signin fails', async () => {
        supabase.auth.signInWithPassword.mockResolvedValue({
            data: null,
            error: { message: 'Invalid credentials' }
        });

        await expect(
            loginUser('test@example.com', 'wrongpassword')
        ).rejects.toThrow('Échec de la connexion');
    });

    test('should throw error if user not found in database', async () => {
        supabase.auth.signInWithPassword.mockResolvedValue({
            data: {
                user: { id: 'user-123' },
                session: { access_token: 'token-abc' }
            },
            error: null
        });

        const dbError = new Error('User not found');
        supabase.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
                data: null,
                error: dbError
            })
        });

        await expect(
            loginUser('test@example.com', 'password123')
        ).rejects.toThrow('User not found');
    });
});
