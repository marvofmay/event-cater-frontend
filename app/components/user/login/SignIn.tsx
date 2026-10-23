import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { CssBaseline, Divider, Card as MuiCard } from '@mui/material';
import ForgotPassword from './ForgotPassword';
import getSignUpTheme from '../register/theme/getSignUpTheme';
import {
    createTheme,
    ThemeProvider,
    styled,
    PaletteMode,
} from '@mui/material/styles';
import { useUser } from "@/app/context/userContext";
import { useTranslation } from 'react-i18next';

const Card = styled(MuiCard)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'center',
    width: '100%',
    padding: theme.spacing(4),
    gap: theme.spacing(2),
    margin: 'auto',
    [theme.breakpoints.up('sm')]: {
        maxWidth: '450px',
    },
    boxShadow:
        'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
    ...theme.applyStyles('dark', {
        boxShadow:
            'hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px',
    }),
}));

const SignInContainer = styled(Stack)(({ theme }) => ({
    minHeight: '100%',
    padding: theme.spacing(2),
    [theme.breakpoints.up('sm')]: {
        padding: theme.spacing(4),
    },
    '&::before': {
        content: '""',
        display: 'block',
        position: 'absolute',
        zIndex: -1,
        inset: 0,
        backgroundImage:
            'radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))',
        backgroundRepeat: 'no-repeat',
        ...theme.applyStyles('dark', {
            backgroundImage:
                'radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))',
        }),
    },
}));

export default function SignIn() {
    const { t } = useTranslation();
    const [emailError, setEmailError] = React.useState(false);
    const [emailErrorMessage, setEmailErrorMessage] = React.useState('');
    const [passwordError, setPasswordError] = React.useState(false);
    const [passwordErrorMessage, setPasswordErrorMessage] = React.useState('');
    const [backendErrorMessage, setBackendErrorMessage] = React.useState('');
    const [open, setOpen] = React.useState(false);
    const [mode] = React.useState<PaletteMode>('light');
    const SignUpTheme = createTheme(getSignUpTheme(mode));
    const { login } = useUser();

    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (emailError || passwordError) {
            return false;
        }

        const data = new FormData(event.currentTarget);
        const emailData = String(data.get('email') ?? '');
        const passwordData = String(data.get('password') ?? '');

        try {
            await login(emailData, passwordData, String(data.get('tenantSlug') || 'default'));
        } catch (err: unknown) {
            if (
                typeof err === 'object' &&
                err !== null &&
                'message' in err &&
                typeof (err as { message?: unknown }).message === 'string'
            ) {
                setBackendErrorMessage((err as { message: string }).message);
            } else {
                setBackendErrorMessage(t('common.message.somethingWentWrong'));
            }
        }
    };

    const validateInputs = () => {
        const email = document.getElementById('email') as HTMLInputElement;
        const password = document.getElementById('password') as HTMLInputElement;

        let isValid = true;

        if (!email.value || !/\S+@\S+\.\S+/.test(email.value)) {
            setEmailError(true);
            setEmailErrorMessage(t('validation.pleaseEnterValidEmailAddress'));
            isValid = false;
        } else {
            setEmailError(false);
            setEmailErrorMessage('');
        }

        if (!password.value || password.value.length < 7) {
            setPasswordError(true);
            setPasswordErrorMessage(t('validation.passwordMustBeAtLeast7CharactersLong'));
            isValid = false;
        } else {
            setPasswordError(false);
            setPasswordErrorMessage('');
        }

        return isValid;
    };

    return (
        <>
            <ThemeProvider theme={SignUpTheme} >
                <CssBaseline enableColorScheme />
                <SignInContainer direction="column" justifyContent="space-between">
                    <Card variant="outlined">
                        <Typography
                            component="h1"
                            variant="h4"
                            sx={{
                                width: '100%',
                                fontSize: 'clamp(1.5rem, 8vw, 1.8rem)',
                                color: '#34495e',
                                textTransform: 'uppercase',
                            }}
                        >
                            {t('loginForm.title.login')}
                        </Typography>
                        <Box>
                            <Typography sx={{ color: 'red' }}>
                                {backendErrorMessage}
                            </Typography>
                        </Box>
                        <Box
                            component="form"
                            method="POST"
                            onSubmit={handleSubmit}
                            noValidate
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                width: '100%',
                                gap: 2,
                            }}
                        >
                            <FormControl>
                                <FormLabel htmlFor="tenantSlug">Kod firmy</FormLabel>
                                <TextField id="tenantSlug" name="tenantSlug" defaultValue="default" required helperText="Kod otrzymany od administratora systemu" inputProps={{pattern: '[a-z0-9][a-z0-9-]{1,62}', maxLength: 63}} />
                            </FormControl>
                            <FormControl>
                                <FormLabel htmlFor="email">{t('loginForm.label.email')}</FormLabel>
                                <TextField
                                    error={emailError}
                                    helperText={emailErrorMessage}
                                    id="email"
                                    type="email"
                                    name="email"
                                    placeholder="your@email.com"
                                    autoComplete="email"
                                    autoFocus
                                    required
                                    fullWidth
                                    variant="outlined"
                                    color={emailError ? 'error' : 'primary'}
                                    sx={{ ariaLabel: 'email', paddingTop: '5px' }}
                                />
                            </FormControl>
                            <FormControl>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <FormLabel htmlFor="password">{t('loginForm.label.password')}</FormLabel>
                                    <Link
                                        component="button"
                                        type="button"
                                        onClick={handleClickOpen}
                                        variant="body2"
                                        sx={{ alignSelf: 'baseline' }}
                                    >
                                        {t('loginForm.question.forgotYourPassword')}
                                    </Link>
                                </Box>
                                <TextField
                                    error={passwordError}
                                    helperText={passwordErrorMessage}
                                    name="password"
                                    placeholder="••••••"
                                    type="password"
                                    id="password"
                                    autoComplete="current-password"
                                    autoFocus
                                    required
                                    fullWidth
                                    variant="outlined"
                                    color={passwordError ? 'error' : 'primary'}
                                />
                            </FormControl>
                            {/* <FormControlLabel
                                control={<Checkbox value="remember" color="primary" />}
                                label={t('loginForm.button.rememberMe')}
                            /> */}
                            <ForgotPassword open={open} handleClose={handleClose} />
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                onClick={validateInputs}
                            >
                                {t('loginForm.button.singIn')}
                            </Button>
                            {/* <Typography sx={{ textAlign: 'center' }}>
                                {t('loginForm.question.dontHaveAccount')}
                                <span>
                                    <Link
                                        href="/register"
                                        variant="body2"
                                        sx={{ alignSelf: 'center' }}
                                    >
                                        {t('loginForm.button.singUp')}
                                    </Link>
                                </span>
                            </Typography> */}
                        </Box>
                        <Divider />
                    </Card>
                </SignInContainer>
            </ThemeProvider >
        </>
    );
}
