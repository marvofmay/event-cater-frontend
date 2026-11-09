<?php

declare(strict_types=1);

namespace App\Module\Saas\Presentation\Console;

use App\Module\Saas\Application\TrialMailer;
use App\Module\Saas\Infrastructure\ControlPlane;
use Ramsey\Uuid\Uuid;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(name: 'app:saas:process-trials', description: 'Send trial ending reminders and suspend expired trial tenants (data kept).')]
final class ProcessTrialsCommand extends Command
{
    private const SYSTEM_ACTOR = '00000000-0000-4000-8000-000000000099';

    public function __construct(private ControlPlane $control, private TrialMailer $mailer)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        if (!$this->control->db()->createSchemaManager()->tablesExist(['saas_tenant'])) {
            $output->writeln('saas_tenant missing');

            return Command::SUCCESS;
        }

        $columns = $this->control->db()->createSchemaManager()->listTableColumns('saas_tenant');
        if (!isset($columns['plan'])) {
            $output->writeln('Trial columns missing - run migrations first.');

            return Command::SUCCESS;
        }

        $now = new \DateTimeImmutable('now');
        $this->sendReminders($now, $output);
        $this->suspendExpired($now, $output);

        return Command::SUCCESS;
    }

    private function sendReminders(\DateTimeImmutable $now, OutputInterface $output): void
    {
        $windows = [
            ['column' => 'trial_reminded_5d_at', 'hours' => 5 * 24, 'label' => '5 dni'],
            ['column' => 'trial_reminded_3d_at', 'hours' => 3 * 24, 'label' => '3 dni'],
            ['column' => 'trial_reminded_24h_at', 'hours' => 24, 'label' => '24 godziny'],
        ];

        foreach ($windows as $window) {
            $center = $now->modify('+'.$window['hours'].' hours');
            $low = $center->modify('-6 hours')->format('Y-m-d H:i:s');
            $high = $center->modify('+6 hours')->format('Y-m-d H:i:s');

            $rows = $this->control->db()->fetchAllAssociative(
                "SELECT * FROM saas_tenant
                 WHERE plan='trial' AND status='active' AND provisioning='ready'
                   AND trial_ends_at IS NOT NULL
                   AND trial_ends_at BETWEEN ? AND ?
                   AND {$window['column']} IS NULL
                   AND slug<>'default'",
                [$low, $high]
            );

            foreach ($rows as $row) {
                $ends = new \DateTimeImmutable($row['trial_ends_at']);
                try {
                    $this->mailer->sendReminder($row['contact_email'], $row['name'], $row['slug'], $ends, $window['label']);
                    $this->control->db()->update(
                        'saas_tenant',
                        [
                            $window['column'] => $now->format('Y-m-d H:i:s'),
                            'updated_at' => $now->format('Y-m-d H:i:s'),
                        ],
                        ['uuid' => $row['uuid']]
                    );
                    $output->writeln(sprintf('Reminder %s → %s (%s)', $window['label'], $row['slug'], $row['contact_email']));
                } catch (\Throwable $e) {
                    $output->writeln(sprintf('Reminder failed for %s: %s', $row['slug'], $e->getMessage()));
                }
            }
        }
    }

    private function suspendExpired(\DateTimeImmutable $now, OutputInterface $output): void
    {
        $rows = $this->control->db()->fetchAllAssociative(
            "SELECT * FROM saas_tenant
             WHERE plan='trial' AND status='active'
               AND trial_ends_at IS NOT NULL AND trial_ends_at <= ?
               AND slug<>'default'",
            [$now->format('Y-m-d H:i:s')]
        );

        foreach ($rows as $row) {
            $this->control->db()->transactional(function () use ($row, $now): void {
                $tenant = $this->control->db()->fetchAssociative('SELECT * FROM saas_tenant WHERE uuid=? FOR UPDATE', [$row['uuid']]);
                if (!$tenant || $tenant['status'] !== 'active' || ($tenant['plan'] ?? '') !== 'trial') {
                    return;
                }
                $this->control->db()->update('saas_tenant', [
                    'status' => 'suspended',
                    'version' => (int) $tenant['version'] + 1,
                    'updated_at' => $now->format('Y-m-d H:i:s'),
                ], ['uuid' => $tenant['uuid']]);
                $this->control->db()->insert('saas_audit', [
                    'uuid' => Uuid::uuid4()->toString(),
                    'tenant_uuid' => $tenant['uuid'],
                    'actor_uuid' => self::SYSTEM_ACTOR,
                    'action' => 'active → suspended',
                    'reason' => 'Automatyczne zawieszenie po zakończeniu 30-dniowego triala. Dane zachowane.',
                    'created_at' => $now->format('Y-m-d H:i:s'),
                ]);
            });
            try {
                $this->mailer->sendSuspendedNotice($row['contact_email'], $row['name'], $row['slug']);
            } catch (\Throwable) {
            }
            $output->writeln('Suspended trial: '.$row['slug']);
        }
    }
}
