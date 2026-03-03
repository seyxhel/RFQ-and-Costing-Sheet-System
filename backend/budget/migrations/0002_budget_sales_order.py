# Generated — add sales_order FK that was split out of 0001_initial
# to fix InconsistentMigrationHistory on databases where budget.0001_initial
# was applied before the sales app existed.

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('budget', '0001_initial'),
        ('sales', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='budget',
            name='sales_order',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='budgets',
                to='sales.salesorder',
            ),
        ),
    ]
