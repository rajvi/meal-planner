import React from 'react';

interface ProgressTrackerProps {
    target: number;
    planned: number;
    consumed?: number;
    label?: string;
    unit?: string;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({
    target,
    planned,
    consumed = 0,
    label = "Calories",
    unit = "kcal"
}) => {
    // 5% Buffer
    const buffer = target * 0.05;
    const minGoal = target - buffer;
    const maxGoal = target + buffer;

    // Scale calculations (padding left/right for better visualization)
    // We want to show a range typically around 0 to target * 1.5
    const maxScale = Math.max(target * 1.5, planned * 1.2, consumed * 1.2);

    const getPercentage = (value: number) => (value / maxScale) * 100;

    const targetPos = getPercentage(target);
    const minPos = getPercentage(minGoal);
    const maxPos = getPercentage(maxGoal);
    const plannedWidth = getPercentage(planned);
    const consumedWidth = getPercentage(consumed);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm mb-6 last:mb-0">
            <div className="flex justify-between items-end mb-4">
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {label} Blueprint
                    </h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">
                            {target}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 font-medium">
                            {unit} target
                        </span>
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-xs font-medium text-gray-400 mb-1 uppercase">Eaten</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {consumed} / {unit}
                    </div>
                </div>
            </div>

            <div className="relative h-12 flex items-center group/track">
                {/* Background Track */}
                <div className="absolute inset-0 h-4 bg-gray-100 dark:bg-gray-700/50 rounded-full my-auto" />

                {/* Sweet Spot (Success Zone) */}
                <div
                    className="absolute h-8 bg-green-500/20 dark:bg-green-500/10 border-x-2 border-green-500/50 my-auto z-0 cursor-help"
                    style={{
                        left: `${minPos}%`,
                        width: `${maxPos - minPos}%`,
                        transition: 'all 0.5s ease-out'
                    }}
                >
                    {/* Hover Tooltip for Sweet Spot */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover/track:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl border border-gray-700 font-bold">
                        Target Range: {Math.round(minGoal)} - {Math.round(maxGoal)} {unit}
                    </div>
                </div>

                {/* Ghost Fill (Planned) - Neutral/Blueish */}
                <div
                    className="absolute h-4 bg-blue-500/10 dark:bg-blue-400/5 rounded-l-full my-auto z-10 pointer-events-none"
                    style={{
                        left: '0',
                        width: `${plannedWidth}%`,
                        transition: 'all 0.5s ease-out'
                    }}
                />

                {/* Actual Fill (Consumed) - Solid Dark/Neutral */}
                <div
                    className="absolute h-4 bg-gray-600 dark:bg-gray-400 rounded-l-full my-auto z-20 shadow-sm pointer-events-none"
                    style={{
                        left: '0',
                        width: `${consumedWidth}%`,
                        transition: 'all 0.5s ease-out'
                    }}
                />

                {/* Target Notch (Center of Sweet Spot) */}
                <div
                    className="absolute h-10 w-1 bg-gray-400 dark:bg-gray-500 my-auto z-30 rounded-full"
                    style={{
                        left: `${targetPos}%`,
                        transform: 'translateX(-50%)'
                    }}
                />

                {/* Simplified Labels below the track */}
                <div className="absolute top-10 left-0 text-[10px] font-bold text-gray-400">0</div>
                <div
                    className="absolute top-10 transform -translate-x-1/2 text-[10px] font-bold text-gray-900 dark:text-white"
                    style={{ left: `${targetPos}%` }}
                >
                    {target}
                </div>
                <div className="absolute top-10 right-0 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                    Max {maxScale.toFixed(0)}
                </div>
            </div>

            {/* Success Zone Context below */}
            <div className="mt-8 flex flex-wrap gap-4 text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500/20 border-x border-green-500/50 rounded-sm" />
                    <span>Success Zone: {Math.round(minGoal)} - {Math.round(maxGoal)} {unit}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500/10 rounded-sm" />
                    <span>Planned Intake: {planned}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-600 dark:bg-gray-400 rounded-sm" />
                    <span>Actual: {consumed}</span>
                </div>
            </div>
        </div>
    );
};

export default ProgressTracker;
