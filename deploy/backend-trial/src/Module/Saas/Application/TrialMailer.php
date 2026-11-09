<?php

declare(strict_types=1);

namespace App\Module\Saas\Application;

use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;

final readonly class TrialMailer
{
    public function __construct(
        #[Autowire(service: 'app.password_recovery.mailer')]
        private MailerInterface $mailer,
        private LoggerInterface $logger,
        #[Autowire('%env(default:password_reset_sender:PASSWORD_RESET_SENDER)%')]
        private string $sender,
        #[Autowire('%env(default:trial_notify_email:TRIAL_NOTIFY_EMAIL)%')]
        private string $notifyEmail,
        #[Autowire('%env(default:app_public_url:APP_URL)%')]
        private string $appUrl,
    ) {
    }

    public function sendOwnerCredentials(string $to, string $companyName, string $slug, #[\SensitiveParameter] string $password, \DateTimeInterface $trialEndsAt): void
    {
        $loginUrl = rtrim($this->appUrl, '/').'/login?tenant='.rawurlencode($slug);
        $ends = $trialEndsAt->format('Y-m-d H:i');
        $body = "Witaj,\n\nTwoje konto próbne EventCater jest gotowe.\n\n"
            ."Firma: {$companyName}\n"
            ."Kod firmy: {$slug}\n"
            ."E-mail (login): {$to}\n"
            ."Hasło: {$password}\n"
            ."Koniec okresu próbnego: {$ends}\n\n"
            ."Logowanie: {$loginUrl}\n\n"
            ."Zachowaj tę wiadomość - hasło nie będzie ponownie wysłane w tej formie.\n"
            ."Po 30 dniach dostęp zostanie zawieszony; dane firmy pozostaną zapisane.\n\n"
            ."EventCater\n";
        $this->send($to, 'EventCater - dane logowania do triala (30 dni)', $body);
    }

    public function sendOperatorNotice(string $companyName, string $slug, string $ownerEmail, \DateTimeInterface $trialEndsAt): void
    {
        $ends = $trialEndsAt->format('Y-m-d H:i');
        $body = "Nowy trial EventCater\n\n"
            ."Firma: {$companyName}\n"
            ."Kod: {$slug}\n"
            ."E-mail właściciela: {$ownerEmail}\n"
            ."Koniec triala: {$ends}\n";
        $this->send($this->notifyEmail, 'EventCater - nowy trial: '.$companyName, $body);
    }

    public function sendReminder(string $to, string $companyName, string $slug, \DateTimeInterface $trialEndsAt, string $windowLabel): void
    {
        $ends = $trialEndsAt->format('Y-m-d H:i');
        $loginUrl = rtrim($this->appUrl, '/').'/login?tenant='.rawurlencode($slug);
        $body = "Witaj,\n\nPrzypominamy, że okres próbny EventCater dla firmy „{$companyName}” "
            ."kończy się za {$windowLabel} (deadline: {$ends}).\n\n"
            ."Kod firmy: {$slug}\n"
            ."Logowanie: {$loginUrl}\n\n"
            ."Po zakończeniu triala konto zostanie zawieszone. Dane pozostaną zachowane - "
            ."po opłaceniu abonamentu możemy ponownie aktywować firmę.\n\n"
            ."Kontakt: {$this->notifyEmail}\n\nEventCater\n";
        $this->send($to, 'EventCater - koniec triala za '.$windowLabel, $body);
    }

    public function sendSuspendedNotice(string $to, string $companyName, string $slug): void
    {
        $body = "Witaj,\n\nOkres próbny EventCater dla firmy „{$companyName}” (kod: {$slug}) zakończył się. "
            ."Konto zostało zawieszone. Dane firmy zostały zachowane.\n\n"
            ."Aby wznowić dostęp, napisz na {$this->notifyEmail}.\n\nEventCater\n";
        $this->send($to, 'EventCater - koniec triala, konto zawieszone', $body);
    }

    private function send(string $to, string $subject, string $body): void
    {
        try {
            $this->mailer->send((new Email())->from($this->sender)->to($to)->subject($subject)->text($body));
        } catch (\Throwable $error) {
            $this->logger->error('Trial mail failed.', [
                'to' => $to,
                'subject' => $subject,
                'errorType' => $error::class,
                'errorMessage' => $error->getMessage(),
            ]);
            throw $error;
        }
    }
}
